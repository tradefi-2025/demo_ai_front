import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../environnement/environment';
import {
  AgentFeatureResponse,
  AgentStatus,
  AgentsPerUserResponse,
  FeatureParameter
} from '../models/reponse/agent-response';
import { OperationResponse } from '../models/reponse/operation-response';
import { Signal, SignalStatus } from '../models/reponse/signal-response';
import { AgentService } from '../services/agent.service';
import { AiAgentService } from '../services/ai-agent.service';
import { BrowserNotificationService } from '../services/browser-notification.service';
import { SignalPollingService } from '../services/signal-polling.service';
import { SignalService } from '../services/signal.service';

type SignalTab = SignalStatus;

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-dashboard.component.html',
  styleUrls: ['./agent-dashboard.component.css']
})
export class AgentDashboardComponent implements OnInit, OnDestroy {
  readonly signalTabs: SignalTab[] = ['NEW', 'READ', 'ARCHIVED'];
  readonly supportsBrowserNotifications: boolean;

  allAgents: AgentsPerUserResponse[] = [];
  readyAgents: AgentsPerUserResponse[] = [];
  launchedAgents: AgentsPerUserResponse[] = [];
  inConstructionAgents: AgentsPerUserResponse[] = [];
  signals: Signal[] = [];

  selectedAgent: AgentsPerUserResponse | null = null;
  selectedSignal: Signal | null = null;
  activeSignalTab: SignalTab = 'NEW';

  isLoadingAgents = false;
  isLoadingSignals = false;
  isRefreshingSignals = false;
  isAutoFetchEnabled = false;
  isUpdatingSignalStatus = new Set<number>();
  isDeletingSignal = new Set<number>();
  pendingAgentActionIds = new Set<number>();
  pendingInferenceAgentIds = new Set<number>();

  errorMessage = '';
  infoMessage = '';
  notificationPermission: NotificationPermission;

  private readonly localActiveAgentIds = new Set<number>();
  private readonly signalPollingIntervalMs = environment.signalPollingIntervalMs;
  private signalPollingSubscription: Subscription | null = null;
  private hasReceivedInitialSignalSnapshot = false;

  constructor(
    private readonly agentService: AgentService,
    private readonly signalService: SignalService,
    private readonly signalPollingService: SignalPollingService,
    private readonly aiAgentService: AiAgentService,
    private readonly browserNotificationService: BrowserNotificationService
  ) {
    this.supportsBrowserNotifications = this.browserNotificationService.isSupported;
    this.notificationPermission = this.browserNotificationService.permission;
  }

  ngOnInit(): void {
    this.loadAgents();
    this.refreshSignals();
  }

  ngOnDestroy(): void {
    this.stopSignalPolling();
  }

  get filteredSignals(): Signal[] {
    return this.signals.filter((signal) => signal.status === this.activeSignalTab);
  }

  get selectedAgentDisplayName(): string {
    if (!this.selectedAgent) {
      return 'No agent selected';
    }

    return this.selectedAgent.name?.trim() || `Agent #${this.selectedAgent.id}`;
  }

  get selectedAgentFeatures(): AgentFeatureResponse[] {
    if (!this.selectedAgent?.agentFeatures) {
      return [];
    }

    return [...this.selectedAgent.agentFeatures].sort((a, b) => a.featureName.localeCompare(b.featureName));
  }

  get selectedAgentSignalCount(): number {
    if (!this.selectedAgent) {
      return 0;
    }

    return this.signals.filter((signal) => signal.agentId === this.selectedAgent?.id).length;
  }

  get selectedAgentNewSignalCount(): number {
    if (!this.selectedAgent) {
      return 0;
    }

    return this.signals.filter(
      (signal) => signal.agentId === this.selectedAgent?.id && signal.status === 'NEW'
    ).length;
  }

  get selectedAgentStatusLabel(): string {
    if (!this.selectedAgent) {
      return 'Inactive';
    }

    return this.getStatusLabel(this.getEffectiveAgentStatus(this.selectedAgent));
  }

  get canLaunchSelectedAgent(): boolean {
    const effectiveStatus = this.selectedAgent ? this.getEffectiveAgentStatus(this.selectedAgent) : null;

    return !!this.selectedAgent
      && (effectiveStatus === AgentStatus.COMPLETED || effectiveStatus === AgentStatus.INACTIVE)
      && !this.isAgentActive(this.selectedAgent)
      && !this.isAgentBusy(this.selectedAgent.id);
  }

  get canDeactivateSelectedAgent(): boolean {
    return !!this.selectedAgent
      && this.isAgentActive(this.selectedAgent)
      && !this.isAgentBusy(this.selectedAgent.id);
  }

  get canRequestSignalFromSelectedAgent(): boolean {
    return !!this.selectedAgent
      && this.isAgentActive(this.selectedAgent)
      && !this.isInferenceBusy(this.selectedAgent.id);
  }

  get generateSignalButtonLabel(): string {
    if (this.selectedAgent && this.isInferenceBusy(this.selectedAgent.id)) {
      return 'Requesting...';
    }

    return 'Generate Signal';
  }

  get notificationButtonLabel(): string {
    if (!this.supportsBrowserNotifications) {
      return 'Notifications unavailable';
    }

    switch (this.notificationPermission) {
      case 'granted':
        return 'Notifications on';
      case 'denied':
        return 'Notifications blocked';
      default:
        return 'Enable notifications';
    }
  }

  get notificationButtonTitle(): string {
    if (!this.supportsBrowserNotifications) {
      return 'This browser does not support system notifications.';
    }

    switch (this.notificationPermission) {
      case 'granted':
        return 'Browser alerts are enabled for this site. New signals can trigger a system notification while the tab is in the background.';
      case 'denied':
        return 'Notifications are blocked for this site. Open the lock icon in the address bar, then Site settings > Notifications > Allow, and reload the page.';
      default:
        return 'Ask the browser for permission to show system alerts for new signals.';
    }
  }

  get inferenceHelperText(): string {
    if (!this.selectedAgent) {
      return 'Select an agent to launch it or request a signal.';
    }

    const effectiveStatus = this.getEffectiveAgentStatus(this.selectedAgent);

    if (effectiveStatus === AgentStatus.ACTIVE) {
      return 'Manual inference is available for the active agent.';
    }

    if (effectiveStatus === AgentStatus.COMPLETED || effectiveStatus === AgentStatus.INACTIVE) {
      return 'Launch the selected agent to enable manual inference.';
    }

    return 'Manual inference becomes available after training completes and the agent is launched.';
  }

  get refreshSignalsButtonLabel(): string {
    return this.isRefreshingSignals ? 'Refreshing...' : 'Refresh now';
  }

  get refreshSignalsButtonTitle(): string {
    return 'Fetch the latest signals once now.';
  }

  get autoFetchButtonLabel(): string {
    return this.isAutoFetchEnabled ? 'Stop auto refresh' : 'Start auto refresh';
  }

  get autoFetchButtonTitle(): string {
    if (this.isAutoFetchEnabled) {
      return `Automatic signal refresh is enabled every ${Math.round(this.signalPollingIntervalMs / 1000)} seconds. Click to stop it.`;
    }

    return `Enable automatic signal refresh every ${Math.round(this.signalPollingIntervalMs / 1000)} seconds.`;
  }

  loadAgents(): void {
    this.isLoadingAgents = true;

    this.agentService.getAgentsByUser().subscribe({
      next: (agents) => {
        this.allAgents = agents;
        this.reconcileLocalActiveAgents(agents);
        this.rebuildAgentBuckets();

        if (!this.selectedAgent) {
          this.selectedAgent = this.launchedAgents[0] ?? this.readyAgents[0] ?? this.inConstructionAgents[0] ?? null;
        } else {
          this.selectedAgent = this.allAgents.find((agent) => agent.id === this.selectedAgent?.id) ?? this.selectedAgent;
        }

        this.isLoadingAgents = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Failed to load agents.');
        this.isLoadingAgents = false;
      }
    });
  }

  selectAgent(agent: AgentsPerUserResponse): void {
    this.selectedAgent = agent;
  }

  selectSignal(signal: Signal): void {
    this.selectedSignal = signal;

    const linkedAgent = this.allAgents.find((agent) => agent.id === signal.agentId);
    if (linkedAgent) {
      this.selectedAgent = linkedAgent;
    }

    if (signal.status === 'NEW') {
      this.updateSignalStatus(signal, 'READ');
    }
  }

  setActiveSignalTab(tab: SignalTab): void {
    this.activeSignalTab = tab;
  }

  getSignalCount(tab: SignalTab): number {
    return this.signals.filter((signal) => signal.status === tab).length;
  }

  getAgentSignalCount(agentId: number, status?: SignalStatus): number {
    return this.signals.filter((signal) => signal.agentId === agentId && (!status || signal.status === status)).length;
  }

  getSortedFeatureParameters(feature: AgentFeatureResponse): FeatureParameter[] {
    return [...(feature.parameters ?? [])].sort((a, b) => {
      if (a.required !== b.required) {
        return Number(b.required) - Number(a.required);
      }

      return a.name.localeCompare(b.name);
    });
  }

  getProbabilityEntries(signal: Signal | null): Array<{ label: string; value: number | null; tone: string }> {
    if (!signal?.probabilities) {
      return [];
    }

    return [
      { label: 'Buy', value: signal.probabilities.buy, tone: 'buy' },
      { label: 'Hold', value: signal.probabilities.hold, tone: 'hold' },
      { label: 'Sell', value: signal.probabilities.sell, tone: 'sell' }
    ];
  }

  getProbabilityPercent(value: number | null): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return Math.max(0, Math.min(100, value * 100));
  }

  getSignalPrimaryLabel(signal: Signal): string {
    return signal.signal?.trim() || signal.estimatedAction?.trim() || 'No label';
  }

  getSignalTone(signal: Signal): 'buy' | 'sell' | 'hold' | 'neutral' {
    const normalized = (signal.signal || signal.estimatedAction || '').toLowerCase();

    if (normalized.includes('buy')) {
      return 'buy';
    }

    if (normalized.includes('sell')) {
      return 'sell';
    }

    if (normalized.includes('hold')) {
      return 'hold';
    }

    return 'neutral';
  }

  getSignalStatusClass(status: SignalStatus): string {
    switch (status) {
      case 'NEW':
        return 'signal-status-new';
      case 'READ':
        return 'signal-status-read';
      case 'ARCHIVED':
        return 'signal-status-archived';
    }
  }

  getSignalStatusLabel(status: SignalStatus): string {
    switch (status) {
      case 'NEW':
        return 'New';
      case 'READ':
        return 'Read';
      case 'ARCHIVED':
        return 'Archived';
    }
  }

  getStatusClass(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.PENDING:
        return 'status-pending';
      case AgentStatus.IN_PROGRESS:
        return 'status-progress';
      case AgentStatus.COMPLETED:
        return 'status-ready';
      case AgentStatus.FAILED:
        return 'status-failed';
      case AgentStatus.CANCELLED:
        return 'status-cancelled';
      case AgentStatus.ACTIVE:
        return 'runtime-active';
      case AgentStatus.INACTIVE:
        return 'runtime-inactive';
    }
  }

  getStatusLabel(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.PENDING:
        return 'Pending';
      case AgentStatus.IN_PROGRESS:
        return 'Training';
      case AgentStatus.COMPLETED:
        return 'Ready';
      case AgentStatus.FAILED:
        return 'Failed';
      case AgentStatus.CANCELLED:
        return 'Cancelled';
      case AgentStatus.ACTIVE:
        return 'Active';
      case AgentStatus.INACTIVE:
        return 'Inactive';
    }
  }

  getAgentStatusClass(agent: AgentsPerUserResponse): string {
    return this.getStatusClass(this.getEffectiveAgentStatus(agent));
  }

  getAgentStatusLabel(agent: AgentsPerUserResponse): string {
    return this.getStatusLabel(this.getEffectiveAgentStatus(agent));
  }

  isSignalBusy(signalId: number): boolean {
    return this.isUpdatingSignalStatus.has(signalId) || this.isDeletingSignal.has(signalId);
  }

  isAgentBusy(agentId: number): boolean {
    return this.pendingAgentActionIds.has(agentId) || this.pendingInferenceAgentIds.has(agentId);
  }

  isInferenceBusy(agentId: number): boolean {
    return this.pendingInferenceAgentIds.has(agentId);
  }

  isAgentActive(agent: AgentsPerUserResponse): boolean {
    return this.getEffectiveAgentStatus(agent) === AgentStatus.ACTIVE;
  }

  async requestBrowserNotificationPermission(): Promise<void> {
    if (!this.supportsBrowserNotifications) {
      this.errorMessage = 'Browser notifications are not supported in this browser.';
      return;
    }

    if (this.notificationPermission === 'granted') {
      this.infoMessage = 'Browser alerts are already enabled.';
      this.errorMessage = '';
      return;
    }

    if (this.notificationPermission === 'denied') {
      this.errorMessage = 'Notifications are blocked for this site. Enable them from the browser site settings, then reload the page.';
      return;
    }

    const permission = await this.browserNotificationService.requestPermission();
    this.notificationPermission = permission;

    if (permission === 'granted') {
      this.infoMessage = 'Browser alerts enabled.';
      this.errorMessage = '';
      return;
    }

    if (permission === 'denied') {
      this.errorMessage = 'Notifications are blocked for this site. Enable them from the browser site settings, then reload the page.';
      return;
    }

    this.infoMessage = 'Browser alert permission was dismissed.';
  }

  refreshSignals(): void {
    if (this.isRefreshingSignals) {
      return;
    }

    if (this.signals.length === 0) {
      this.isLoadingSignals = true;
    }

    this.isRefreshingSignals = true;

    this.signalService.getUserSignals().subscribe({
      next: (signals) => {
        this.processSignalSnapshot(signals);
        this.isLoadingSignals = false;
        this.isRefreshingSignals = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Failed to load signals.');
        this.isLoadingSignals = false;
        this.isRefreshingSignals = false;
      }
    });
  }

  toggleAutoFetch(): void {
    if (this.isAutoFetchEnabled) {
      this.stopSignalPolling();
      this.infoMessage = 'Auto fetch disabled.';
      return;
    }

    this.startSignalPolling();
    this.infoMessage = 'Auto fetch enabled.';
    this.errorMessage = '';
  }

  launchSelectedAgent(): void {
    if (!this.selectedAgent || !this.canLaunchSelectedAgent) {
      return;
    }

    this.runAgentAction(
      this.selectedAgent.id,
      this.aiAgentService.launchAgent(this.selectedAgent.id),
      () => {
        this.localActiveAgentIds.add(this.selectedAgent!.id);
        this.infoMessage = `${this.selectedAgentDisplayName} launched successfully.`;
        this.loadAgents();
      }
    );
  }

  deactivateSelectedAgent(): void {
    if (!this.selectedAgent || !this.canDeactivateSelectedAgent) {
      return;
    }

    this.runAgentAction(
      this.selectedAgent.id,
      this.aiAgentService.deactivateAgent(this.selectedAgent.id),
      () => {
        this.localActiveAgentIds.delete(this.selectedAgent!.id);
        this.infoMessage = `${this.selectedAgentDisplayName} deactivated successfully.`;
        this.loadAgents();
      }
    );
  }

  async onGenerateSignal(): Promise<void> {
    if (!this.selectedAgent || !this.canRequestSignalFromSelectedAgent) {
      return;
    }

    const agentId = this.selectedAgent.id;
    const knownSignalIds = new Set(this.signals.map((signal) => signal.signalId));

    this.pendingInferenceAgentIds.add(agentId);
    this.errorMessage = '';
    this.infoMessage = '';

    this.aiAgentService.requestInference(agentId).subscribe({
      next: async (response) => {
        if (!this.isOperationSuccessful(response)) {
          this.errorMessage = response.errorMessage || 'Signal inference failed.';
          this.pendingInferenceAgentIds.delete(agentId);
          return;
        }

        this.infoMessage = 'Signal request accepted. Waiting for persistence...';

        const foundSignal = await this.waitForPersistedSignal(agentId, knownSignalIds);
        this.pendingInferenceAgentIds.delete(agentId);

        if (foundSignal) {
          this.infoMessage = 'A new signal has been received.';
          this.selectSignal(foundSignal);
        } else {
          this.infoMessage = 'Inference launched. The signal will appear as soon as it is stored.';
        }
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Signal inference failed.');
        this.pendingInferenceAgentIds.delete(agentId);
      }
    });
  }

  markSignalAsRead(signal: Signal): void {
    this.updateSignalStatus(signal, 'READ');
  }

  archiveSignal(signal: Signal): void {
    this.updateSignalStatus(signal, 'ARCHIVED');
  }

  restoreSignalToNew(signal: Signal): void {
    this.updateSignalStatus(signal, 'NEW');
  }

  deleteSignal(signal: Signal): void {
    if (this.isSignalBusy(signal.signalId)) {
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';
    this.isDeletingSignal.add(signal.signalId);

    this.signalService.deleteSignal(signal.signalId).subscribe({
      next: () => {
        this.signals = this.signals.filter((item) => item.signalId !== signal.signalId);

        if (this.selectedSignal?.signalId === signal.signalId) {
          this.selectedSignal = null;
        }

        this.isDeletingSignal.delete(signal.signalId);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Failed to delete signal.');
        this.isDeletingSignal.delete(signal.signalId);
      }
    });
  }

  dismissInfoMessage(): void {
    this.infoMessage = '';
  }

  dismissErrorMessage(): void {
    this.errorMessage = '';
  }

  private startSignalPolling(): void {
    if (this.isAutoFetchEnabled) {
      return;
    }

    this.isAutoFetchEnabled = true;
    this.signalPollingSubscription?.unsubscribe();
    this.signalPollingSubscription = this.signalPollingService
      .createPollingStream(this.signalPollingIntervalMs)
      .subscribe({
        next: (signals) => {
          this.processSignalSnapshot(signals);
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Auto fetch failed.');
          this.stopSignalPolling();
        }
      });
  }

  private stopSignalPolling(): void {
    this.signalPollingSubscription?.unsubscribe();
    this.signalPollingSubscription = null;
    this.isAutoFetchEnabled = false;
  }

  private processSignalSnapshot(signals: Signal[]): void {
    const sortedSignals = this.sortSignalsByDateDescending(signals);
    const previousSignalIds = new Set(this.signals.map((signal) => signal.signalId));
    const newSignals = sortedSignals.filter((signal) => !previousSignalIds.has(signal.signalId));

    this.signals = sortedSignals;

    if (this.selectedSignal) {
      this.selectedSignal = this.signals.find((signal) => signal.signalId === this.selectedSignal?.signalId) ?? null;
    }

    if (this.hasReceivedInitialSignalSnapshot) {
      newSignals
        .filter((signal) => signal.status === 'NEW')
        .forEach((signal) => this.browserNotificationService.notifySignal(signal));
    }

    this.hasReceivedInitialSignalSnapshot = true;
  }

  private async waitForPersistedSignal(agentId: number, knownSignalIds: Set<number>): Promise<Signal | null> {
    const attempts = 6;
    const waitMs = 2000;

    for (let attempt = 0; attempt < attempts; attempt++) {
      await this.delay(waitMs);

      try {
        const signals = await firstValueFrom(this.signalService.getUserSignals());
        this.processSignalSnapshot(signals);

        const newSignal = this.signals.find(
          (signal) => signal.agentId === agentId && !knownSignalIds.has(signal.signalId)
        );

        if (newSignal) {
          return newSignal;
        }
      } catch (error) {
        this.errorMessage = this.extractErrorMessage(error, 'Signal was requested but could not be refreshed.');
        return null;
      }
    }

    return null;
  }

  private updateSignalStatus(signal: Signal, status: SignalStatus): void {
    if (signal.status === status || this.isSignalBusy(signal.signalId)) {
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';
    this.isUpdatingSignalStatus.add(signal.signalId);

    this.signalService.updateSignalStatus(signal.signalId, { status }).subscribe({
      next: (updatedSignal) => {
        this.replaceSignal(updatedSignal);
        this.isUpdatingSignalStatus.delete(signal.signalId);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Failed to update signal status.');
        this.isUpdatingSignalStatus.delete(signal.signalId);
      }
    });
  }

  private replaceSignal(updatedSignal: Signal): void {
    this.signals = this.sortSignalsByDateDescending(
      this.signals.map((signal) => signal.signalId === updatedSignal.signalId ? updatedSignal : signal)
    );

    if (this.selectedSignal?.signalId === updatedSignal.signalId) {
      this.selectedSignal = updatedSignal;
    }
  }

  private rebuildAgentBuckets(): void {
    this.launchedAgents = this.allAgents.filter(
      (agent) => this.getEffectiveAgentStatus(agent) === AgentStatus.ACTIVE
    );
    this.readyAgents = this.allAgents.filter(
      (agent) => {
        const effectiveStatus = this.getEffectiveAgentStatus(agent);
        return effectiveStatus === AgentStatus.COMPLETED || effectiveStatus === AgentStatus.INACTIVE;
      }
    );
    this.inConstructionAgents = this.allAgents.filter(
      (agent) => !this.launchedAgents.includes(agent) && !this.readyAgents.includes(agent)
    );
  }

  private reconcileLocalActiveAgents(agents: AgentsPerUserResponse[]): void {
    for (const agent of agents) {
      const backendStatus = agent.trainingStatus;

      if (backendStatus === AgentStatus.ACTIVE) {
        this.localActiveAgentIds.add(agent.id);
      } else {
        this.localActiveAgentIds.delete(agent.id);
      }
    }
  }

  private getEffectiveAgentStatus(agent: AgentsPerUserResponse): AgentStatus {
    if (this.localActiveAgentIds.has(agent.id)) {
      return AgentStatus.ACTIVE;
    }

    return agent.trainingStatus;
  }

  private runAgentAction(
    agentId: number,
    request$: ReturnType<AiAgentService['launchAgent']>,
    onSuccess: () => void
  ): void {
    this.pendingAgentActionIds.add(agentId);
    this.errorMessage = '';
    this.infoMessage = '';

    request$.subscribe({
      next: (response) => {
        if (!this.isOperationSuccessful(response)) {
          this.errorMessage = response.errorMessage || 'The operation failed.';
          this.pendingAgentActionIds.delete(agentId);
          return;
        }

        onSuccess();
        this.pendingAgentActionIds.delete(agentId);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'The operation failed.');
        this.pendingAgentActionIds.delete(agentId);
      }
    });
  }

  private isOperationSuccessful(response: OperationResponse | null | undefined): boolean {
    return response?.success === true;
  }

  private sortSignalsByDateDescending(signals: Signal[]): Signal[] {
    return [...signals].sort((a, b) => new Date(b.signalDate).getTime() - new Date(a.signalDate).getTime());
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Server unreachable. Please verify that the requested service is running.';
      }

      const backendMessage = error.error?.errorMessage || error.error?.message;
      return backendMessage || error.message || fallback;
    }

    if (error instanceof Error) {
      return error.message || fallback;
    }

    return fallback;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
