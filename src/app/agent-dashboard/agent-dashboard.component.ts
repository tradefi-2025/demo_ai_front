import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { AgentService } from '../services/agent.service';
import { PredictionService } from '../services/prediction.service';
import { AgentsPerUserResponse, AgentStatus } from '../models/reponse/agent-response';
import { PredictionResponse } from '../models/reponse/prediction-response';

@Component({
  selector: 'app-agent-dashboard',
  templateUrl: './agent-dashboard.component.html',
  styleUrls: ['./agent-dashboard.component.css']
})
export class AgentDashboardComponent implements OnInit {

  @ViewChild('predictionCanvas') predictionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('marketCanvas') marketCanvas!: ElementRef<HTMLCanvasElement>;

  // Agent lists
  allAgents: AgentsPerUserResponse[] = [];
  readyAgents: AgentsPerUserResponse[] = [];
  inConstructionAgents: AgentsPerUserResponse[] = [];

  // Selected agent
  selectedAgent: AgentsPerUserResponse | null = null;

  // Predictions
  allPredictions: PredictionResponse[] = [];
  agentPredictions: PredictionResponse[] = [];
  selectedPrediction: PredictionResponse | null = null;

  // Predictions tab state
  activeTab: 'all' | 'agent' = 'all';

  // Chart view mode: 'combined' = both on same chart, 'separate' = two separate charts
  chartViewMode: 'combined' | 'separate' = 'combined';

  // Calendar state
  currentDate: Date = new Date();
  calendarDays: { day: number | null; isInPeriod: boolean; isWeekend: boolean }[] = [];
  selectedDate: Date | null = null;
  selectedHour: number | null = null;

  // Hours for hourly scale
  hours: number[] = Array.from({ length: 24 }, (_, i) => i);

  // Period highlight (based on predictionScale)
  highlightedPeriod: { start: Date; end: Date } | null = null;

  // Year/Month picker
  years: number[] = [];
  months: { value: number; name: string }[] = [
    { value: 0, name: 'January' },
    { value: 1, name: 'February' },
    { value: 2, name: 'March' },
    { value: 3, name: 'April' },
    { value: 4, name: 'May' },
    { value: 5, name: 'June' },
    { value: 6, name: 'July' },
    { value: 7, name: 'August' },
    { value: 8, name: 'September' },
    { value: 9, name: 'October' },
    { value: 10, name: 'November' },
    { value: 11, name: 'December' }
  ];

  // Loading states
  isLoadingAgents: boolean = false;
  isLoadingPredictions: boolean = false;
  isPredicting: boolean = false;

  // Error messages
  errorMessage: string = '';

  constructor(
    private agentService: AgentService,
    private predictionService: PredictionService
  ) {
    // Generate years from 2020 to current year + 5
    const currentYear = new Date().getFullYear();
    for (let year = 2020; year <= currentYear + 5; year++) {
      this.years.push(year);
    }
  }

  ngOnInit(): void {
    this.loadAgents();
    this.loadAllPredictions();
    this.generateCalendar();
  }

  loadAgents(): void {
    this.isLoadingAgents = true;
    this.agentService.getAgentsByUser().subscribe({
      next: (agents) => {
        this.allAgents = agents;
        this.readyAgents = agents.filter(
          a => a.trainingStatus === AgentStatus.COMPLETED
        );
        this.inConstructionAgents = agents.filter(
          a => a.trainingStatus === AgentStatus.PENDING ||
               a.trainingStatus === AgentStatus.IN_PROGRESS
        );
        this.isLoadingAgents = false;
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        this.errorMessage = 'Failed to load agents';
        this.isLoadingAgents = false;
      }
    });
  }

  loadAllPredictions(): void {
    this.isLoadingPredictions = true;
    this.predictionService.getUserPredictions().subscribe({
      next: (predictions) => {
        this.allPredictions = predictions;
        this.isLoadingPredictions = false;
      },
      error: (err) => {
        console.error('Error loading predictions:', err);
        this.isLoadingPredictions = false;
      }
    });
  }

  selectAgent(agent: AgentsPerUserResponse): void {
    this.selectedAgent = agent;
    this.selectedPrediction = null;
    this.selectedHour = null;
    this.agentPredictions = this.allPredictions.filter(p => p.agentId === agent.id);
    // Switch to agent tab when an agent is selected
    this.activeTab = 'agent';
    // Update highlighted period if a date is already selected
    this.updateHighlightedPeriod();
  }

  setActiveTab(tab: 'all' | 'agent'): void {
    this.activeTab = tab;
  }

  get displayedPredictions(): PredictionResponse[] {
    if (this.activeTab === 'all') {
      return this.allPredictions;
    }
    return this.agentPredictions;
  }

  getAgentNameById(agentId: number): string {
    const agent = this.allAgents.find(a => a.id === agentId);
    return agent?.name || agent?.targetMarket || `Agent #${agentId}`;
  }

  selectPrediction(prediction: PredictionResponse): void {
    this.selectedPrediction = prediction;
    // Also select the agent if viewing all predictions
    if (this.activeTab === 'all') {
      const agent = this.allAgents.find(a => a.id === prediction.agentId);
      if (agent) {
        this.selectedAgent = agent;
        this.agentPredictions = this.allPredictions.filter(p => p.agentId === agent.id);
      }
    }
    setTimeout(() => {
      this.drawCharts();
    }, 100);
  }

  // Calendar methods
  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    this.calendarDays = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push({ day: null, isInPeriod: false, isWeekend: false });
    }

    // Add the days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isInPeriod = this.isDateInHighlightedPeriod(date);

      this.calendarDays.push({ day, isInPeriod, isWeekend });
    }
  }

  // Check if a date is within the highlighted period
  isDateInHighlightedPeriod(date: Date): boolean {
    if (!this.highlightedPeriod) return false;
    return date >= this.highlightedPeriod.start && date <= this.highlightedPeriod.end;
  }

  // Calculate the highlighted period based on agent's predictionScale
  updateHighlightedPeriod(): void {
    if (!this.selectedDate || !this.selectedAgent) {
      this.highlightedPeriod = null;
      this.generateCalendar();
      return;
    }

    const scale = this.selectedAgent.predictionScale;
    const date = this.selectedDate;

    switch (scale) {
      case 'HOURLY':
        // For hourly, highlight just the selected day
        this.highlightedPeriod = {
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate())
        };
        break;

      case 'DAILY':
        // For daily, highlight just the selected day
        this.highlightedPeriod = {
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate())
        };
        break;

      case 'WEEKLY':
        // For weekly, highlight the entire week (Monday to Friday)
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        this.highlightedPeriod = { start: monday, end: friday };
        break;

      case 'MONTHLY':
        // For monthly, highlight the entire month
        this.highlightedPeriod = {
          start: new Date(date.getFullYear(), date.getMonth(), 1),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
        };
        break;

      default:
        this.highlightedPeriod = null;
    }

    this.generateCalendar();
  }

  // Get the period label for display
  getPeriodLabel(): string {
    if (!this.selectedAgent || !this.selectedDate) return '';

    const scale = this.selectedAgent.predictionScale;
    const date = this.selectedDate;

    switch (scale) {
      case 'HOURLY':
        if (this.selectedHour !== null) {
          return `${date.toLocaleDateString()} at ${this.selectedHour}:00`;
        }
        return `${date.toLocaleDateString()} - Select an hour`;

      case 'DAILY':
        return `Day: ${date.toLocaleDateString()}`;

      case 'WEEKLY':
        if (this.highlightedPeriod) {
          const weekNum = this.getWeekNumber(date);
          return `Week ${weekNum}: ${this.highlightedPeriod.start.toLocaleDateString()} - ${this.highlightedPeriod.end.toLocaleDateString()}`;
        }
        return '';

      case 'MONTHLY':
        return `Month: ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

      default:
        return '';
    }
  }

  // Get week number of the year
  getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Check if hour selector should be shown
  shouldShowHourSelector(): boolean {
    return this.selectedAgent?.predictionScale === 'HOURLY' && this.selectedDate !== null;
  }

  // Select an hour
  selectHour(hour: number): void {
    this.selectedHour = hour;
  }

  // Handle hour change from select dropdown
  onHourChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedHour = value ? parseInt(value, 10) : null;
  }

  // Check if hour is selected
  isSelectedHour(hour: number): boolean {
    return this.selectedHour === hour;
  }

  get currentYear(): number {
    return this.currentDate.getFullYear();
  }

  get currentMonth(): number {
    return this.currentDate.getMonth();
  }

  onYearChange(event: Event): void {
    const year = parseInt((event.target as HTMLSelectElement).value, 10);
    this.currentDate = new Date(year, this.currentDate.getMonth(), 1);
    this.generateCalendar();
  }

  onMonthChange(event: Event): void {
    const month = parseInt((event.target as HTMLSelectElement).value, 10);
    this.currentDate = new Date(this.currentDate.getFullYear(), month, 1);
    this.generateCalendar();
  }

  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }

  selectDay(day: number | null): void {
    if (day === null) return;
    this.selectedDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );
    this.selectedHour = null; // Reset hour when day changes
    this.updateHighlightedPeriod();
  }

  isSelectedDay(day: number | null): boolean {
    if (!day || !this.selectedDate) return false;
    return (
      this.selectedDate.getDate() === day &&
      this.selectedDate.getMonth() === this.currentDate.getMonth() &&
      this.selectedDate.getFullYear() === this.currentDate.getFullYear()
    );
  }

  // Check if a day is in the highlighted period
  isDayInPeriod(day: number | null): boolean {
    if (!day || !this.highlightedPeriod) return false;
    const date = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );
    return this.isDateInHighlightedPeriod(date);
  }

  // Check if a day is a weekend
  isDayWeekend(day: number | null): boolean {
    if (!day) return false;
    const date = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  getMonthName(): string {
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check if selected agent can make predictions (must be COMPLETED)
  get canPredict(): boolean {
    return this.selectedAgent?.trainingStatus === AgentStatus.COMPLETED;
  }

  // Predict action
  predict(): void {
    if (!this.selectedAgent || !this.selectedDate) {
      this.errorMessage = 'Please select an agent and a date';
      return;
    }

    // For hourly scale, require an hour to be selected
    if (this.selectedAgent.predictionScale === 'HOURLY' && this.selectedHour === null) {
      this.errorMessage = 'Please select an hour for hourly predictions';
      return;
    }

    // Check if agent is ready (COMPLETED)
    if (this.selectedAgent.trainingStatus !== AgentStatus.COMPLETED) {
      this.errorMessage = 'This agent is still in training. Please wait until training is complete.';
      return;
    }

    this.isPredicting = true;
    this.errorMessage = '';

    const request = {
      agentId: this.selectedAgent.id,
      predictionDate: this.formatPredictionDate()
    };

    this.predictionService.predict(request).subscribe({
      next: (prediction) => {
        this.allPredictions.unshift(prediction);
        this.agentPredictions.unshift(prediction);
        this.selectedPrediction = prediction;
        this.isPredicting = false;
        setTimeout(() => {
          this.drawCharts();
        }, 100);
      },
      error: (err) => {
        console.error('Error making prediction:', err);
        this.errorMessage = 'Failed to make prediction';
        this.isPredicting = false;
      }
    });
  }

  // Format the prediction date - always ISO 8601 with time (YYYY-MM-DDTHH:mm:ss)
  // The back will determine the period (month, week, day, hour) based on agent's predictionScale
  formatPredictionDate(): string {
    if (!this.selectedDate) return '';

    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');

    // For HOURLY, use the selected hour; otherwise default to 00:00:00
    const hour = (this.selectedAgent?.predictionScale === 'HOURLY' && this.selectedHour !== null)
      ? String(this.selectedHour).padStart(2, '0')
      : '00';

    return `${year}-${month}-${day}T${hour}:00:00`;
  }

  // Toggle between combined and separate chart views
  toggleChartViewMode(): void {
    this.chartViewMode = this.chartViewMode === 'combined' ? 'separate' : 'combined';
    setTimeout(() => this.drawCharts(), 100);
  }

  // Draw all charts based on current view mode
  drawCharts(): void {
    if (this.chartViewMode === 'combined') {
      this.drawPredictionChart();
    } else {
      this.drawPredictionChartSeparate();
      this.drawMarketChart();
    }
  }

  // Chart drawing methods - Combined mode (both on same chart)
  drawPredictionChart(): void {
    if (!this.selectedPrediction || !this.predictionCanvas) return;

    const canvas = this.predictionCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prediction = this.selectedPrediction.prediction;
    const actualMarket = this.selectedPrediction.actualMarket;

    if (!prediction || prediction.length === 0) return;

    // Draw prediction line
    this.drawChart(ctx, canvas, prediction, '#3a86ff', 'Prediction');

    // If actualMarket data is available, draw it on the same chart
    if (actualMarket && actualMarket.length > 0) {
      this.drawChartOverlay(ctx, canvas, actualMarket, prediction, '#06d6a0', 'Actual');
    }
  }

  // Draw prediction chart only (for separate mode)
  drawPredictionChartSeparate(): void {
    if (!this.selectedPrediction || !this.predictionCanvas) return;

    const canvas = this.predictionCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prediction = this.selectedPrediction.prediction;
    if (!prediction || prediction.length === 0) return;

    this.drawChart(ctx, canvas, prediction, '#3a86ff', 'Prediction');
  }

  // Draw market chart (for separate mode)
  drawMarketChart(): void {
    if (!this.selectedPrediction || !this.marketCanvas) return;

    const canvas = this.marketCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const actualMarket = this.selectedPrediction.actualMarket;
    if (!actualMarket || actualMarket.length === 0) return;

    this.drawChart(ctx, canvas, actualMarket, '#06d6a0', 'Actual Market');
  }

  // Check if actual market data is available
  hasActualMarketData(): boolean {
    return !!(this.selectedPrediction?.actualMarket && this.selectedPrediction.actualMarket.length > 0);
  }

  // Draw an overlay chart on existing canvas (for comparison)
  drawChartOverlay(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    values: number[],
    referenceValues: number[],
    color: string,
    label: string
  ): void {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Use combined min/max for consistent scale
    const allValues = [...values, ...referenceValues];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw the overlay curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line for actual data
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw legend
    const legendY = padding - 10;
    ctx.fillStyle = color;
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`--- ${label}`, width - padding, legendY);
  }

  drawChart(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    values: number[],
    color: string,
    label: string
  ): void {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (values.length === 0) {
      ctx.fillStyle = '#8d99ae';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw the curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = color + '20';
    ctx.fill();

    // Draw label
    ctx.fillStyle = '#1d3557';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, 20);

    // Draw Y-axis labels
    ctx.fillStyle = '#8d99ae';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = minVal + (range / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(value.toFixed(2), padding - 5, y + 3);
    }
  }

  getStatusLabel(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.PENDING: return 'Pending';
      case AgentStatus.IN_PROGRESS: return 'Training...';
      case AgentStatus.COMPLETED: return 'Ready';
      case AgentStatus.FAILED: return 'Failed';
      case AgentStatus.CANCELLED: return 'Cancelled';
      default: return status;
    }
  }

  getStatusClass(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.PENDING: return 'status-pending';
      case AgentStatus.IN_PROGRESS: return 'status-progress';
      case AgentStatus.COMPLETED: return 'status-ready';
      case AgentStatus.FAILED: return 'status-failed';
      case AgentStatus.CANCELLED: return 'status-cancelled';
      default: return '';
    }
  }
}
