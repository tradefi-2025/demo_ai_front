import { Component, OnInit } from '@angular/core';
import { MARKETS_LIST } from "../shared/data/const-market-list";
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InfoService } from "../services/agent.service";
import { Feature } from "../models/API/feature";

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

  constructor(private fb: FormBuilder, private infoService: InfoService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFeatures();
  }

  // Initialisation du formulaire
  private initForm(): void {
    this.myForm = this.fb.group({
      username: ['', [Validators.required]],
      agentName: ['', [Validators.required]],
      email: [''],
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
    this.infoService.getFeatures().subscribe(
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