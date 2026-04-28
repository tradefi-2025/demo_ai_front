import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { FeatureService } from '../services/feature.service';
import { AgentService } from '../services/agent.service';
import { Feature } from '../models/API/feature';
import { AgentFormDTO } from '../models/request/new-agent-form-dto';
import { Parameter } from '../models/API/parameter.model';
import { MARKETS_LIST } from '../shared/data/const-market-list';

@Component({
  selector: 'app-nouveau-agent',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './nouveau-agent.component.html',
  styleUrls: ['./nouveau-agent.component.css']
})
export class NouveauAgentComponent implements OnInit {
  private readonly fileOptionSources: Record<string, string[]> = {
    'const-market-list': MARKETS_LIST,
  };

  form!: FormGroup;
  featureList: Feature[] = [];
  errorMessage = '';
  isSubmitting = false;


  // ── Getters ────────────────────────────────────────────────
  get agentName(): AbstractControl { return this.form.get('agentName')!; }
  get featuresGroup(): FormGroup   { return this.form.get('features') as FormGroup; }

  constructor(
    private fb: FormBuilder,
    private featureService: FeatureService,
    private agentService: AgentService,
    private router: Router
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────
  ngOnInit(): void {
    this.form = this.fb.group({
      agentName: ['', Validators.required],
      features:  this.fb.group({})
    });

    this.featureService.getFeatures().subscribe(
      res => this.featureList = res.features
    );
  }

  // ── Feature toggle ─────────────────────────────────────────
  isSelected(featureName: string): boolean {
    return this.featuresGroup.contains(featureName);
  }

  toggleFeature(featureName: string): void {
    if (this.isSelected(featureName)) {
      this.featuresGroup.removeControl(featureName);
      return;
    }

    const feature = this.featureList.find(f => f.name === featureName);
    if (!feature) return;

    const group = this.fb.group(
      Object.fromEntries(
        Object.entries(feature.parameters).map(([key, val]) => [
          key,
          this.fb.control(this.getInitialParameterValue(val), this.getParameterValidators(val))
        ])
      )
    );
    this.featuresGroup.addControl(featureName, group);
  }

  paramKeys(feature: Feature): string[] {
    return Object.keys(feature.parameters);
  }

  getSortedParameterEntries(feature: Feature): Array<{ key: string; parameter: Parameter }> {
    return Object.entries(feature.parameters)
      .map(([key, parameter]) => ({ key, parameter }))
      .sort((a, b) => {
        if (a.parameter.required !== b.parameter.required) {
          return Number(b.parameter.required) - Number(a.parameter.required);
        }

        const aTypeRank = this.getTypeRank(a.parameter.type);
        const bTypeRank = this.getTypeRank(b.parameter.type);
        if (aTypeRank !== bTypeRank) {
          return aTypeRank - bTypeRank;
        }

        return a.key.localeCompare(b.key);
      });
  }

  getParameterOptions(parameter: Parameter): string[] {
    if (parameter.type === 'ENUM') {
      return parameter.enumValues ?? [];
    }

    if (parameter.type === 'FILE') {
      return this.fileOptionSources[this.normalizeFileKey(parameter.fileName)] ?? [];
    }

    return [];
  }

  isSelectParameter(parameter: Parameter): boolean {
    return parameter.type === 'ENUM' || parameter.type === 'FILE';
  }

  isBooleanParameter(parameter: Parameter): boolean {
    return parameter.type === 'BOOLEAN';
  }

  getInputType(parameter: Parameter): string {
    switch (parameter.type) {
      case 'INTEGER':
      case 'INT':
      case 'LONG':
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'NUMBER':
        return 'number';
      case 'DATE':
        return 'date';
      case 'DATETIME':
      case 'DATETIME_LOCAL':
        return 'datetime-local';
      case 'EMAIL':
        return 'email';
      case 'PASSWORD':
        return 'password';
      case 'URL':
        return 'url';
      default:
        return 'text';
    }
  }

  getInputStep(parameter: Parameter): string | null {
    switch (parameter.type) {
      case 'INTEGER':
      case 'INT':
      case 'LONG':
        return '1';
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'NUMBER':
        return 'any';
      default:
        return null;
    }
  }

  getFeatureDescription(feature: Feature): string {
    return feature.description?.trim() ?? '';
  }

  getParameterControl(featureName: string, paramName: string): AbstractControl {
    return this.featuresGroup.get([featureName, paramName])!;
  }

  // ── Submit ─────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage  = '';

    const payload = {
      name:     this.agentName.value,
      features: this.featuresGroup.value
    } as AgentFormDTO;

    this.agentService.createAgent(payload).subscribe({
      next:     (ok) => ok ? this.router.navigate(['/agent-dashboard']) : this.setError('Agent creation failed.'),
      error:    (err) => this.setError(err.message ?? 'An unexpected error occurred.'),
      complete: () => this.isSubmitting = false
    });
  }

  private setError(msg: string): void {
    this.errorMessage  = msg;
    this.isSubmitting  = false;
  }

  private getParameterValidators(parameter: Parameter): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (parameter.required) {
      validators.push(Validators.required);
    }

    if (parameter.minValue !== null && parameter.minValue !== undefined) {
      validators.push(Validators.min(parameter.minValue));
    }

    if (parameter.maxValue !== null && parameter.maxValue !== undefined) {
      validators.push(Validators.max(parameter.maxValue));
    }

    return validators;
  }

  private normalizeFileKey(fileName: string | undefined): string {
    return (fileName ?? '').replace(/\.ts$/i, '').trim();
  }

  private getInitialParameterValue(parameter: Parameter): string | number | boolean | null {
    if (parameter.defaultValue !== null && parameter.defaultValue !== undefined) {
      return parameter.defaultValue;
    }

    if (this.isBooleanParameter(parameter)) {
      return false;
    }

    if (this.isSelectParameter(parameter)) {
      return this.getParameterOptions(parameter)[0] ?? '';
    }

    return '';
  }

  private getTypeRank(type: string): number {
    switch (type) {
      case 'ENUM':
      case 'FILE':
        return 0;
      case 'BOOLEAN':
        return 1;
      case 'INTEGER':
      case 'INT':
      case 'LONG':
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'NUMBER':
        return 2;
      default:
        return 3;
    }
  }
}
