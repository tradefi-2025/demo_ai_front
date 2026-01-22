import { Component, OnInit } from '@angular/core';
import { MARKETS_LIST } from "../shared/data/const-market-list";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeatureService } from '../services/feature.service';
import { Feature } from "../models/API/feature";
import { AgentService } from '../services/agent.service';
import { AgentFormDTO } from '../models/request/new-agent-form-dto';
import { Router } from '@angular/router';
import { combineLatest } from "rxjs";
import { startWith } from "rxjs/operators";

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

  // Liste complète des fréquences avec valeur en minutes pour calculs
  allFrequencies = [
    { value: 'MIN_1', label: '1 minute', minutes: 1 },
    { value: 'MIN_5', label: '5 minutes', minutes: 5 },
    { value: 'MIN_15', label: '15 minutes', minutes: 15 },
    { value: 'MIN_30', label: '30 minutes', minutes: 30 },
    { value: 'HOUR_1', label: '1 hour', minutes: 60 },
    { value: 'DAY_1', label: '1 day', minutes: 1440 },
    { value: 'WEEK_1', label: '1 week', minutes: 10080 }
  ];

  // Prediction scales avec valeur en minutes
  predictionScales = [
    { value: 'HOURLY', label: 'Hourly', minutes: 60 },
    { value: 'DAILY', label: 'Daily', minutes: 1440 },
    { value: 'WEEKLY', label: 'Weekly', minutes: 10080 },
    { value: 'MONTHLY', label: 'Monthly', minutes: 43200 }
  ];

  // Liste filtrée des fréquences (< predictionScale)
  filteredFrequencies: { value: string; label: string; minutes: number }[] = [];

  // Niveaux hiérarchiques entre predictionScale et frequency
  // Ordre: MONTH > WEEK > DAY > HOUR > MINUTE
  hierarchyLevels: string[] = [];

  // Options pour chaque niveau (input)
  inputWeeks: { value: number; label: string }[] = [];
  inputDays: { value: number; label: string }[] = [];
  inputHours: { value: number; label: string }[] = [];
  inputMinutes: { value: number; label: string }[] = [];

  // Options pour chaque niveau (output)
  outputWeeks: { value: number; label: string }[] = [];
  outputDays: { value: number; label: string }[] = [];
  outputHours: { value: number; label: string }[] = [];
  outputMinutes: { value: number; label: string }[] = [];

  // Flags pour afficher les sections
  showInputSection: boolean = false;
  showOutputSection: boolean = false;

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
    this.initPredictionScaleListener();
    this.frequencyAndPredictionInit();
  }

  // Initialisation du formulaire
  private initForm(): void {
    this.myForm = this.fb.group({
      agentName: ['', [Validators.required]],
      targetMarket: [''],
      // Input time - hiérarchie complète
      inputStartWeek: [''],
      inputStartDay: [''],
      inputStartHour: [''],
      inputStartMinute: [''],
      inputEndWeek: [''],
      inputEndDay: [''],
      inputEndHour: [''],
      inputEndMinute: [''],
      // Output time - hiérarchie complète
      outputStartWeek: [''],
      outputStartDay: [''],
      outputStartHour: [''],
      outputStartMinute: [''],
      outputEndWeek: [''],
      outputEndDay: [''],
      outputEndHour: [''],
      outputEndMinute: [''],
      frequency: [''],
      predictionScale: [''],
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
      name: this.myForm.get('agentName')?.value,
      targetMarket: this.myForm.get('targetMarket')?.value,
      // Calculer les slots globaux pour input/output
      inputStartTime: this.calculateSlotValue('inputStart'),
      inputEndTime: this.calculateSlotValue('inputEnd'),
      outputStartTime: this.calculateSlotValue('outputStart'),
      outputEndTime: this.calculateSlotValue('outputEnd'),
      frequency: this.myForm.get('frequency')?.value,
      predictionScale: this.myForm.get('predictionScale')?.value,
      features: this.myForm.get('features')?.value
    } as AgentFormDTO;

    this.agentService.createAgent(agentFormDTO).subscribe({
      next: (value) => {
        if (value){
          this.router.navigate(['/agent-dashboard'])
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

  // Calcule le slot global à partir des valeurs hiérarchiques
  // prefix = 'inputStart', 'inputEnd', 'outputStart', 'outputEnd'
  private calculateSlotValue(prefix: string): number {
    const week = Number(this.myForm.get(`${prefix}Week`)?.value) || 0;
    const day = Number(this.myForm.get(`${prefix}Day`)?.value) || 0;
    const hour = Number(this.myForm.get(`${prefix}Hour`)?.value) || 0;
    const minute = Number(this.myForm.get(`${prefix}Minute`)?.value) || 0;

    // Nombre de slots par niveau (toujours 5 jours - weekend fermé)
    const daysPerWeek = 5;
    const hoursPerDay = 24;
    const minuteSlotsPerHour = this.getMinuteSlotsPerHour();

    let totalSlot = 0;

    // Calcul selon les niveaux présents
    if (this.hasLevel('WEEK')) {
      // Contribution des semaines (en slots)
      totalSlot += (week - 1) * daysPerWeek * hoursPerDay * minuteSlotsPerHour;
    }
    if (this.hasLevel('DAY')) {
      // Contribution des jours
      totalSlot += (day - 1) * hoursPerDay * minuteSlotsPerHour;
    }
    if (this.hasLevel('HOUR')) {
      // Contribution des heures
      totalSlot += hour * minuteSlotsPerHour;
    }
    if (this.hasLevel('MINUTE')) {
      // Contribution des minutes (déjà en slots)
      totalSlot += minute;
    }

    // Si le niveau le plus bas n'est pas MINUTE, on retourne directement le slot du dernier niveau
    const lastLevel = this.hierarchyLevels[this.hierarchyLevels.length - 1];
    if (lastLevel === 'WEEK') return week;
    if (lastLevel === 'DAY') return day + (week - 1) * daysPerWeek;
    if (lastLevel === 'HOUR') return hour + (day - 1) * hoursPerDay + (week - 1) * daysPerWeek * hoursPerDay;

    return totalSlot || 0;
  }

  // Retourne le nombre de slots minutes par heure selon la frequency
  private getMinuteSlotsPerHour(): number {
    const freq = this.myForm.get('frequency')?.value;
    switch (freq) {
      case 'MIN_1': return 60;
      case 'MIN_5': return 12;
      case 'MIN_15': return 4;
      case 'MIN_30': return 2;
      default: return 1;
    }
  }

  private frequencyAndPredictionInit() {
    const freqControl = this.myForm.get('frequency');
    const predControl = this.myForm.get('predictionScale');

    if (freqControl && predControl) {
      combineLatest([
        freqControl.valueChanges.pipe(startWith(freqControl.value)),
        predControl.valueChanges.pipe(startWith(predControl.value))
      ]).subscribe(([frequency, predictionScale]) => {
        if (frequency && predictionScale) {
          this.intputAndOutPutInit(frequency, predictionScale);
        }
      });
    }
  }

  // Écoute les changements de predictionScale et filtre les fréquences
  private initPredictionScaleListener(): void {
    const predScaleCtrl = this.myForm.get('predictionScale');

    if (predScaleCtrl) {
      predScaleCtrl.valueChanges.subscribe((predictionScaleValue: string) => {
        const predScale = this.predictionScales.find(p => p.value === predictionScaleValue);

        if (predScale) {
          // Filtrer les fréquences dont les minutes sont < à celles de la predictionScale
          this.filteredFrequencies = this.allFrequencies.filter(
            freq => freq.minutes < predScale.minutes
          );

          // Réinitialiser frequency si la valeur actuelle n'est plus valide
          const freqCtrl = this.myForm.get('frequency');
          if (freqCtrl && !this.filteredFrequencies.some(f => f.value === freqCtrl.value)) {
            freqCtrl.setValue('');
          }
        } else {
          this.filteredFrequencies = [];
        }
      });
    }
  }

  // Retourne les minutes d'une fréquence par sa valeur string
  getMinutesFromFrequency(frequencyValue: string): number {
    const freq = this.allFrequencies.find(f => f.value === frequencyValue);
    return freq ? freq.minutes : 0;
  }

  // Retourne les minutes d'une prediction scale par sa valeur string
  getMinutesFromPredictionScale(predictionScaleValue: string): number {
    const pred = this.predictionScales.find(p => p.value === predictionScaleValue);
    return pred ? pred.minutes : 0;
  }

  // Calcule les niveaux hiérarchiques et initialise les options
  private intputAndOutPutInit(frequencyValue: string, predictionScaleValue: string): void {
    // Définir les niveaux entre predictionScale et frequency
    this.hierarchyLevels = this.getHierarchyLevels(predictionScaleValue, frequencyValue);

    if (this.hierarchyLevels.length === 0) {
      this.showInputSection = false;
      this.showOutputSection = false;
      return;
    }

    this.showInputSection = true;

    // Initialiser les options pour le premier niveau (input)
    this.initInputOptions();

    // Reset tous les champs
    this.resetAllTimeFields();

    // Écouter les changements pour la cascade
    this.initCascadeListeners();
  }

  // Retourne les niveaux hiérarchiques entre predictionScale et frequency
  private getHierarchyLevels(predScale: string, freq: string): string[] {
    const allLevels = ['WEEK', 'DAY', 'HOUR', 'MINUTE'];

    const predIndex = this.getPredictionLevelIndex(predScale);
    const freqIndex = this.getFrequencyLevelIndex(freq);

    if (predIndex === -1 || freqIndex === -1 || predIndex > freqIndex) {
      return [];
    }

    // Si predIndex === freqIndex (ex: HOURLY + MINUTE), on retourne juste ce niveau
    return allLevels.slice(predIndex, freqIndex + 1);
  }

  // Index du niveau pour predictionScale (0=MONTHLY->WEEK, 1=WEEKLY->DAY, etc.)
  private getPredictionLevelIndex(predScale: string): number {
    switch (predScale) {
      case 'MONTHLY': return 0;  // Commence à WEEK
      case 'WEEKLY': return 1;   // Commence à DAY
      case 'DAILY': return 2;    // Commence à HOUR
      case 'HOURLY': return 3;   // Commence à MINUTE
      default: return -1;
    }
  }

  // Index du niveau pour frequency
  private getFrequencyLevelIndex(freq: string): number {
    switch (freq) {
      case 'WEEK_1': return 0;   // Termine à WEEK
      case 'DAY_1': return 1;    // Termine à DAY
      case 'HOUR_1': return 2;   // Termine à HOUR
      case 'MIN_1':
      case 'MIN_5':
      case 'MIN_15':
      case 'MIN_30': return 3;   // Termine à MINUTE
      default: return -1;
    }
  }

  // Initialise les options pour TOUS les niveaux input
  private initInputOptions(): void {
    // Initialiser chaque niveau présent dans la hiérarchie
    for (const level of this.hierarchyLevels) {
      switch (level) {
        case 'WEEK':
          this.inputWeeks = this.generateOptions(4, 'Week');
          break;
        case 'DAY':
          // Toujours 5 jours (weekend fermé pour le trading)
          this.inputDays = this.generateOptions(5, 'Day');
          break;
        case 'HOUR':
          this.inputHours = this.generateOptions(24, 'Hour', 0);
          break;
        case 'MINUTE':
          this.inputMinutes = this.generateMinuteOptions();
          break;
      }
    }
  }

  // Génère les options pour un niveau donné
  private generateOptions(count: number, label: string, startFrom: number = 1): { value: number; label: string }[] {
    const options = [];
    for (let i = startFrom; i < startFrom + count; i++) {
      options.push({ value: i, label: `${label} ${i}` });
    }
    return options;
  }

  // Génère les options minutes selon la frequency (en slots)
  private generateMinuteOptions(): { value: number; label: string }[] {
    const freq = this.myForm.get('frequency')?.value;
    const options = [];

    let step ;
    let totalSlots

    switch (freq) {
      case 'MIN_5':
        step = 5;
        totalSlots = 12; // 60/5 = 12 slots
        break;
      case 'MIN_15':
        step = 15;
        totalSlots = 4; // 60/15 = 4 slots
        break;
      case 'MIN_30':
        step = 30;
        totalSlots = 2; // 60/30 = 2 slots
        break;
      default:
        step = 1;
        totalSlots = 60; // 60 slots
    }

    // Pour MIN_1: slots 1 à 60
    // Pour MIN_5: slots 1 à 12 (représentant 0, 5, 10, 15...)
    for (let i = 1; i <= totalSlots; i++) {
      const minuteValue = (i - 1) * step;
      options.push({
        value: i, // Le slot (1, 2, 3...)
        label: `Slot ${i} (${minuteValue} min)`
      });
    }
    return options;
  }

  // Reset tous les champs de temps
  private resetAllTimeFields(): void {
    const fields = [
      'inputStartWeek', 'inputStartDay', 'inputStartHour', 'inputStartMinute',
      'inputEndWeek', 'inputEndDay', 'inputEndHour', 'inputEndMinute',
      'outputStartWeek', 'outputStartDay', 'outputStartHour', 'outputStartMinute',
      'outputEndWeek', 'outputEndDay', 'outputEndHour', 'outputEndMinute'
    ];
    fields.forEach(field => this.myForm.get(field)?.setValue(''));

    // Reset output options
    this.outputWeeks = [];
    this.outputDays = [];
    this.outputHours = [];
    this.outputMinutes = [];
    this.showOutputSection = false;
  }

  // Initialise les listeners pour la cascade
  private initCascadeListeners(): void {
    // Écouter inputEnd pour activer output
    this.listenToInputEnd();
  }

  // Écoute le dernier niveau de inputEnd pour activer outputSection
  private listenToInputEnd(): void {
    const lastLevel = this.hierarchyLevels[this.hierarchyLevels.length - 1];
    let controlName = '';

    switch (lastLevel) {
      case 'WEEK': controlName = 'inputEndWeek'; break;
      case 'DAY': controlName = 'inputEndDay'; break;
      case 'HOUR': controlName = 'inputEndHour'; break;
      case 'MINUTE': controlName = 'inputEndMinute'; break;
    }

    const ctrl = this.myForm.get(controlName);
    if (ctrl) {
      ctrl.valueChanges.subscribe(value => {
        if (value !== '' && value !== null) {
          this.showOutputSection = true;
          this.initOutputOptions();
        } else {
          this.showOutputSection = false;
        }
      });
    }
  }

  // Initialise les options output (seulement ce qui reste après inputEnd)
  // L'output peut être dans la MÊME semaine/jour/heure que inputEnd, mais à une période ultérieure
  private initOutputOptions(): void {
    // Récupérer les valeurs de fin d'input
    const inputEndWeek = Number(this.myForm.get('inputEndWeek')?.value) || 0;


    // Filtrer les options output pour qu'elles commencent APRÈS inputEnd
    // Mais on peut choisir la même semaine/jour/heure si le niveau inférieur est après
    for (const level of this.hierarchyLevels) {
      switch (level) {
        case 'WEEK':
          // On peut choisir la même semaine ou une semaine ultérieure
          this.outputWeeks = this.inputWeeks.filter(w => w.value >= inputEndWeek);
          break;
        case 'DAY':
          // Tous les jours disponibles, sera filtré dynamiquement selon la semaine choisie
          this.outputDays = [...this.inputDays];
          break;
        case 'HOUR':
          // Toutes les heures disponibles, sera filtré dynamiquement
          this.outputHours = [...this.inputHours];
          break;
        case 'MINUTE':
          // Toutes les minutes disponibles, sera filtré dynamiquement
          this.outputMinutes = [...this.inputMinutes];
          break;
      }
    }
  }

  // Helper: vérifie si un niveau est dans la hiérarchie
  hasLevel(level: string): boolean {
    return this.hierarchyLevels.includes(level);
  }

  // Getters pour les options filtrées (End >= Start)
  getFilteredInputEndWeeks(): { value: number; label: string }[] {
    const start = this.myForm.get('inputStartWeek')?.value;
    if (!start) return this.inputWeeks;
    return this.inputWeeks.filter(w => w.value >= Number(start));
  }

  getFilteredInputEndDays(): { value: number; label: string }[] {
    const start = this.myForm.get('inputStartDay')?.value;
    if (!start) return this.inputDays;
    return this.inputDays.filter(d => d.value >= Number(start));
  }

  getFilteredInputEndHours(): { value: number; label: string }[] {
    const start = this.myForm.get('inputStartHour')?.value;
    if (!start && start !== 0) return this.inputHours;
    return this.inputHours.filter(h => h.value >= Number(start));
  }

  getFilteredInputEndMinutes(): { value: number; label: string }[] {
    const start = this.myForm.get('inputStartMinute')?.value;
    if (!start && start !== 0) return this.inputMinutes;
    return this.inputMinutes.filter(m => m.value >= Number(start));
  }

  getFilteredOutputEndWeeks(): { value: number; label: string }[] {
    const start = this.myForm.get('outputStartWeek')?.value;
    if (!start) return this.outputWeeks;
    return this.outputWeeks.filter(w => w.value >= Number(start));
  }

  getFilteredOutputEndDays(): { value: number; label: string }[] {
    const start = this.myForm.get('outputStartDay')?.value;
    if (!start) return this.getFilteredOutputStartDays();
    return this.getFilteredOutputStartDays().filter(d => d.value >= Number(start));
  }

  getFilteredOutputEndHours(): { value: number; label: string }[] {
    const start = this.myForm.get('outputStartHour')?.value;
    if (!start && start !== 0) return this.getFilteredOutputStartHours();
    return this.getFilteredOutputStartHours().filter(h => h.value >= Number(start));
  }

  getFilteredOutputEndMinutes(): { value: number; label: string }[] {
    const start = this.myForm.get('outputStartMinute')?.value;
    if (!start && start !== 0) return this.getFilteredOutputStartMinutes();
    return this.getFilteredOutputStartMinutes().filter(m => m.value >= Number(start));
  }

  // Getters pour filtrer outputStart en fonction de inputEnd
  // L'output peut commencer dans la MÊME semaine que inputEnd, mais à un jour/heure/minute ultérieur
  getFilteredOutputStartWeeks(): { value: number; label: string }[] {
    const inputEndWeek = Number(this.myForm.get('inputEndWeek')?.value) || 0;
    // On peut choisir la même semaine ou une semaine ultérieure
    return this.inputWeeks.filter(w => w.value >= inputEndWeek);
  }

  getFilteredOutputStartDays(): { value: number; label: string }[] {
    const inputEndDay = Number(this.myForm.get('inputEndDay')?.value) || 0;
    const inputEndWeek = Number(this.myForm.get('inputEndWeek')?.value) || 0;
    const outputStartWeek = Number(this.myForm.get('outputStartWeek')?.value) || 0;

    // Si on a des semaines et que outputStartWeek > inputEndWeek, tous les jours sont disponibles
    if (this.hasLevel('WEEK') && outputStartWeek > inputEndWeek) {
      return this.inputDays;
    }
    // Si même semaine, filtrer les jours > inputEndDay (strictement après)
    return this.inputDays.filter(d => d.value > inputEndDay);
  }

  getFilteredOutputStartHours(): { value: number; label: string }[] {
    const inputEndHour = Number(this.myForm.get('inputEndHour')?.value) || 0;
    const inputEndDay = Number(this.myForm.get('inputEndDay')?.value) || 0;
    const inputEndWeek = Number(this.myForm.get('inputEndWeek')?.value) || 0;
    const outputStartWeek = Number(this.myForm.get('outputStartWeek')?.value) || 0;
    const outputStartDay = Number(this.myForm.get('outputStartDay')?.value) || 0;

    // Si on est dans une semaine ultérieure, toutes les heures sont disponibles
    if (this.hasLevel('WEEK') && outputStartWeek > inputEndWeek) {
      return this.inputHours;
    }
    // Si on est dans un jour ultérieur (même semaine ou pas de semaine), toutes les heures sont disponibles
    if (this.hasLevel('DAY') && outputStartDay > inputEndDay) {
      return this.inputHours;
    }
    // Si même jour, filtrer les heures > inputEndHour (strictement après)
    return this.inputHours.filter(h => h.value > inputEndHour);
  }

  getFilteredOutputStartMinutes(): { value: number; label: string }[] {
    const inputEndMinute = Number(this.myForm.get('inputEndMinute')?.value) || 0;
    const inputEndHour = Number(this.myForm.get('inputEndHour')?.value) || 0;
    const inputEndDay = Number(this.myForm.get('inputEndDay')?.value) || 0;
    const inputEndWeek = Number(this.myForm.get('inputEndWeek')?.value) || 0;
    const outputStartWeek = Number(this.myForm.get('outputStartWeek')?.value) || 0;
    const outputStartDay = Number(this.myForm.get('outputStartDay')?.value) || 0;
    const outputStartHour = Number(this.myForm.get('outputStartHour')?.value) || 0;

    // Si on est dans une semaine ultérieure, toutes les minutes sont disponibles
    if (this.hasLevel('WEEK') && outputStartWeek > inputEndWeek) {
      return this.inputMinutes;
    }
    // Si on est dans un jour ultérieur, toutes les minutes sont disponibles
    if (this.hasLevel('DAY') && outputStartDay > inputEndDay) {
      return this.inputMinutes;
    }
    // Si on est dans une heure ultérieure, toutes les minutes sont disponibles
    if (this.hasLevel('HOUR') && outputStartHour > inputEndHour) {
      return this.inputMinutes;
    }
    // Si même heure, filtrer les minutes > inputEndMinute (strictement après)
    return this.inputMinutes.filter(m => m.value > inputEndMinute);
  }
}
