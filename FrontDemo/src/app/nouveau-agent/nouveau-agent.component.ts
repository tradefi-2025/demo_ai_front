import { Component, OnInit } from '@angular/core';
import { MARKETS_LIST } from "../shared/data/const-market-list";
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeatureService } from '../services/feature.service';
import { Feature } from "../models/API/feature";
import { AgentService } from '../services/agent.service';
import { AgentFormDTO } from '../models/request/new-agent-form-dto';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nouveau-agent',
  templateUrl: './nouveau-agent.component.html',
  styleUrls: ['./nouveau-agent.component.css']
})
export class NouveauAgentComponent implements OnInit {
  // Formulaire principal
  myForm!: FormGroup;
  
  // Données
  marketLists = MARKETS_LIST;
  featureLists!: Feature[];
  
  // Modal d'erreur
  showErrorModal: boolean = false;
  errorMessage: string = '';

  constructor(private fb: FormBuilder,
     private featureService: FeatureService,
    private agentService : AgentService,
  private router: Router) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFeatures();
  }

  // Initialisation du formulaire
  private initForm(): void {
    this.myForm = this.fb.group({
      agentName: ['', [Validators.required]],
      targetMarket: [''],
      inputStartTime: [''],
      inputEndTime: [''],
      inputFrequency :[''],
      outputStartTime: [''],
      outputEndTime: [''],
      outputFrequency :[''],
      features: this.fb.group({})
    });
  }

  // Charge les features depuis l'API
  private loadFeatures(): void {
    this.featureService.getFeatures().subscribe(
      (res) => this.featureLists = res.features
    );
  }

  // Gestion des features (ajout/suppression)
  addOuRemoveFeature(featureName: string): void {
    const features = this.myForm.get('features') as FormGroup;
    const existingFeature = features.get(featureName);
    
    if (existingFeature) {
      features.removeControl(featureName);
    } else {
      const newFeatureGroup = this.fb.group({});
      features.addControl(featureName, newFeatureGroup);
      
      this.populateFeatureParams(newFeatureGroup, featureName);
    }
  }

  // Vérifie si une feature est sélectionnée
  isFeatureSelected(featureName: string): boolean {
    const features = this.myForm.get('features') as FormGroup;
    return features.contains(featureName);
  }

  // Ajoute les paramètres à un groupe de feature
  private populateFeatureParams(featureGroup: FormGroup, featureName: string): void {
    const feature = this.findFeatureByName(featureName);
    
    if (!feature) {
      console.error(`Feature "${featureName}" not found`);
      return;
    }
    
    for (const paramName of Object.keys(feature.parameters)) {
      const defaultValue = feature.parameters[paramName] || '';
      featureGroup.addControl(paramName, this.fb.control(defaultValue));
    }
  }

  // Trouve une feature par son nom
  private findFeatureByName(name: string): Feature | undefined {
    return this.featureLists.find(feature => 
      feature.name.trim() === name.trim()
    );
  }

  private sendFormToBack(){
    //maper le form à un AgentFormDTO()
    const agentFormDTO = {
      agentName: this.myForm.get('agentName')?.value,
      targetMarket: this.myForm.get('targetMarket')?.value,
      inputStartTime: this.myForm.get('inputStartTime')?.value,
      inputEndTime: this.myForm.get('inputEndTime')?.value,
      inputFrequency: this.myForm.get('inputFrequency')?.value,
      outputStartTime: this.myForm.get('outputStartTime')?.value,
      outputEndTime: this.myForm.get('outputEndTime')?.value,
      outputFrequency: this.myForm.get('outputFrequency')?.value,
      features: this.myForm.get('features')?.value
    } as AgentFormDTO;

    this.agentService.createAgent(agentFormDTO).subscribe({
      next: (value) => {
        if (value){
          this.router.navigate(['/consulter-agent'])
        }else{
          this.errorModal("La création de l'agent a échoué");
        }
      },
      error: (err) => {
        this.errorModal(err.message || "Une erreur est survenue lors de la création de l'agent");
      }
    })
  }
  
  // Fonction pour afficher le modal d'erreur
  errorModal(msg?: string): void {
    this.errorMessage = msg || "Une erreur est survenue, veuillez réessayer";
    this.showErrorModal = true;
  }
  
  // Fonction pour fermer le modal
  closeModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
  }
  
  // Soumet le formulaire
  onSubmit(): void {
    if (this.myForm.valid) {
      this.sendFormToBack();
    } else {
      this.markFormGroupTouched(this.myForm);
    }
  }

  // Marque tous les contrôles comme touchés pour afficher les validations
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  getParamKeys(feature: Feature): string[] {
    return Object.keys(feature.parameters);
  }
}