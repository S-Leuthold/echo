# ==============================================================================
# FILE: echo/mock_project_service.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Generates comprehensive mock project data for testing and development.
#   Creates realistic project portfolios for Echo development and soil
#   biogeochemistry research that integrate with session management.
#
# FEATURES:
#   - Structured project data with milestones, focus areas, and status tracking
#   - Integration with existing session logs and weekly syncs
#   - Realistic project progression and momentum indicators
#   - Support for project hierarchies and dependencies
# ==============================================================================

import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class ProjectStatus(Enum):
    """Project status categories."""
    ACTIVE = "active"
    PLANNING = "planning"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectPriority(Enum):
    """Project priority levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    CRITICAL = "critical"


@dataclass
class ProjectMilestone:
    """Represents a project milestone or deliverable."""
    id: str
    title: str
    description: str
    due_date: date
    status: str  # "pending", "in_progress", "completed", "overdue"
    priority: str
    estimated_hours: int
    actual_hours: Optional[int] = None
    completion_date: Optional[date] = None
    deliverables: List[str] = None
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.deliverables is None:
            self.deliverables = []
        if self.dependencies is None:
            self.dependencies = []


@dataclass
class ProjectData:
    """Comprehensive project data structure."""
    id: str
    name: str
    description: str
    status: ProjectStatus
    priority: ProjectPriority
    created_date: date
    category: str  # "development", "research", "personal", "collaboration"
    current_focus: str
    progress_percentage: float
    momentum: str  # "accelerating", "steady", "slowing", "stalled"
    total_estimated_hours: int
    total_actual_hours: int
    time_spent_this_week: int
    time_spent_this_month: int
    milestones: List[ProjectMilestone]
    key_stakeholders: List[str]
    success_criteria: List[str]
    risks_and_blockers: List[str]
    recent_wins: List[str]
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    
    # Optional fields with defaults
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None
    tags: List[str] = None
    parent_project_id: Optional[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        # Convert enums to strings
        data['status'] = self.status.value
        data['priority'] = self.priority.value
        # Convert dates to ISO format
        data['created_date'] = self.created_date.isoformat()
        if self.target_completion:
            data['target_completion'] = self.target_completion.isoformat()
        if self.actual_completion:
            data['actual_completion'] = self.actual_completion.isoformat()
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        
        # Convert milestone dates
        for milestone in data['milestones']:
            milestone['due_date'] = milestone['due_date'].isoformat() if isinstance(milestone['due_date'], date) else milestone['due_date']
            if milestone['completion_date']:
                milestone['completion_date'] = milestone['completion_date'].isoformat() if isinstance(milestone['completion_date'], date) else milestone['completion_date']
        
        return data


class MockProjectService:
    """Service for generating realistic mock project data."""
    
    def __init__(self):
        self.projects = []
        self._generate_all_projects()
    
    def _generate_all_projects(self):
        """Generate all mock projects."""
        # Echo Development Projects
        self.projects.extend([
            self._create_echo_core_project(),
            self._create_echo_frontend_project(),
            self._create_echo_claude_integration_project(),
            self._create_echo_mobile_project()
        ])
        
        # Research Projects
        self.projects.extend([
            self._create_soil_carbon_dynamics_project(),
            self._create_microbial_ecology_project(),
            self._create_climate_impact_study_project(),
            self._create_nsf_grant_project()
        ])
        
        # Personal/Professional Projects
        self.projects.extend([
            self._create_academic_writing_project(),
            self._create_lab_management_project()
        ])
    
    def _create_echo_core_project(self) -> ProjectData:
        """Create the main Echo backend project."""
        milestones = [
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Session Intelligence System",
                description="Complete Claude integration for session scaffolding, checklists, and log synthesis",
                due_date=date(2025, 8, 15),
                status="in_progress",
                priority="high",
                estimated_hours=120,
                actual_hours=85,
                deliverables=[
                    "Scaffold generator with Claude Sonnet integration",
                    "Session starter with real-time checklist generation",
                    "Session logger with hybrid voice model",
                    "Production API endpoints"
                ],
                dependencies=["Claude API integration", "Database schema completion"]
            ),
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Planning System V2",
                description="Unified planning system with email intelligence and context briefings",
                due_date=date(2025, 9, 1),
                status="completed",
                priority="high",
                estimated_hours=80,
                actual_hours=75,
                completion_date=date(2025, 7, 20),
                deliverables=[
                    "Four-panel intelligence architecture",
                    "Claude Opus strategic planning",
                    "Email categorization with structured outputs",
                    "Context briefing system"
                ]
            ),
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Analytics & Journaling",
                description="Enhanced analytics with pattern recognition and evening reflection system",
                due_date=date(2025, 9, 15),
                status="pending",
                priority="medium",
                estimated_hours=60,
                deliverables=[
                    "Time ledger with category breakdown",
                    "Energy and mood trend analysis",
                    "Enhanced evening reflection prompts",
                    "Productivity scoring algorithms"
                ]
            )
        ]
        
        return ProjectData(
            id="echo_core",
            name="Echo Core Backend",
            description="The intelligent daily planning system with LLM integration, session management, and comprehensive analytics. Core backend services and API infrastructure.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH,
            created_date=date(2025, 1, 15),
            target_completion=date(2025, 10, 1),
            actual_completion=None,
            category="development",
            tags=["python", "fastapi", "claude", "ai", "productivity", "backend"],
            current_focus="Completing session intelligence system with Claude integration and production-ready API endpoints",
            progress_percentage=75.0,
            momentum="accelerating",
            total_estimated_hours=260,
            total_actual_hours=160,
            time_spent_this_week=18,
            time_spent_this_month=45,
            milestones=milestones,
            key_stakeholders=["Sam Leuthold (Developer)", "End Users", "Research Team"],
            success_criteria=[
                "Session intelligence system fully operational",
                "Sub-30-second planning generation with Claude Opus",
                "Accurate time tracking and analytics",
                "Seamless email integration with Outlook",
                "Production deployment with monitoring"
            ],
            risks_and_blockers=[
                "Claude API costs scaling with usage",
                "Email OAuth token refresh reliability",
                "Database performance with large session history"
            ],
            recent_wins=[
                "Completed four-panel intelligence architecture",
                "Successfully integrated Claude Sonnet for structured outputs",
                "Mock data foundation established for comprehensive testing",
                "Hybrid voice model working perfectly for session logs"
            ],
            created_at=datetime(2025, 1, 15, 9, 0),
            updated_at=datetime.now(),
            metadata={
                "repository": "https://github.com/S-Leuthold/echo.git",
                "primary_language": "Python",
                "framework": "FastAPI",
                "ai_provider": "Anthropic Claude",
                "deployment_target": "Local + Cloud Ready"
            }
        )
    
    def _create_echo_frontend_project(self) -> ProjectData:
        """Create the Echo frontend project."""
        milestones = [
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Today Page Redesign",
                description="Two-column layout with dynamic timeline and session management",
                due_date=date(2025, 7, 30),
                status="completed",
                priority="high",
                estimated_hours=40,
                actual_hours=35,
                completion_date=date(2025, 7, 25),
                deliverables=[
                    "CSS Grid two-column layout (70/30 split)",
                    "Dynamic timeline with mathematical scaling",
                    "Session state management with gold accent buttons",
                    "PlanTimeline component with context switching"
                ]
            ),
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Session Intelligence UI",
                description="Frontend integration for Claude session management features",
                due_date=date(2025, 8, 20),
                status="in_progress",
                priority="high",
                estimated_hours=50,
                actual_hours=15,
                deliverables=[
                    "Scaffold display in Spin-Up state",
                    "Real-time checklist generation UI",
                    "Session completion form with debrief inputs",
                    "AI insights display and interaction"
                ]
            )
        ]
        
        return ProjectData(
            id="echo_frontend",
            name="Echo Frontend Application",
            description="Next.js React application providing the user interface for Echo's planning and session management system. Focus on premium UX and intelligent interaction design.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH,
            created_date=date(2025, 3, 1),
            target_completion=date(2025, 9, 15),
            category="development",
            tags=["nextjs", "react", "typescript", "tailwindcss", "ui", "frontend"],
            current_focus="Integrating Claude session intelligence features with premium dashboard aesthetics",
            progress_percentage=60.0,
            momentum="steady",
            total_estimated_hours=120,
            total_actual_hours=50,
            time_spent_this_week=8,
            time_spent_this_month=25,
            milestones=milestones,
            key_stakeholders=["Sam Leuthold (Developer)", "End Users"],
            success_criteria=[
                "Seamless session management workflow",
                "Premium dashboard aesthetic consistently applied",
                "Mobile-responsive design working perfectly",
                "Real-time data updates from backend API",
                "Intuitive user experience for daily planning"
            ],
            risks_and_blockers=[
                "Complex state management across session phases",
                "Real-time API integration challenges",
                "Timeline scaling mathematics complexity"
            ],
            recent_wins=[
                "Today page two-column layout achieved perfect scaling",
                "Session state management with proper data flow",
                "Eliminated dead space with structured Card components",
                "Gold accent button system providing premium feel"
            ],
            created_at=datetime(2025, 3, 1, 10, 30),
            updated_at=datetime.now(),
            metadata={
                "framework": "Next.js 14",
                "styling": "Tailwind CSS",
                "state_management": "React Context + Local State",
                "api_integration": "FastAPI Backend"
            }
        )
    
    def _create_echo_claude_integration_project(self) -> ProjectData:
        """Create the Claude integration project."""
        milestones = [
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Mock Data Foundation",
                description="Comprehensive mock data system for testing Claude integration",
                due_date=date(2025, 7, 25),
                status="completed",
                priority="high",
                estimated_hours=30,
                actual_hours=28,
                completion_date=date(2025, 7, 25),
                deliverables=[
                    "Mock session service with realistic logs",
                    "Weekly sync generator for project context",
                    "Database schema with proper indexing",
                    "Population scripts with validation"
                ]
            ),
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Production API Endpoints",
                description="RESTful API endpoints for session management integration",
                due_date=date(2025, 7, 25),
                status="completed",
                priority="high",
                estimated_hours=25,
                actual_hours=22,
                completion_date=date(2025, 7, 25),
                deliverables=[
                    "POST /session/generate-scaffolds endpoint",
                    "POST /session/start with checklist generation",
                    "POST /session/complete with log synthesis",
                    "GET /session/scaffold/{block_id} retrieval"
                ]
            )
        ]
        
        return ProjectData(
            id="echo_claude_integration", 
            name="Echo Claude Integration",
            description="Advanced AI integration using Claude Sonnet for session intelligence, scaffolding, and hybrid voice model synthesis. Three-phase architecture for comprehensive session management.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.CRITICAL,
            created_date=date(2025, 7, 20),
            target_completion=date(2025, 8, 5),
            category="development",
            tags=["claude", "ai", "session-management", "api", "intelligence"],
            current_focus="Finalizing production API endpoints and testing comprehensive integration workflow",
            progress_percentage=90.0,
            momentum="accelerating",
            total_estimated_hours=80,
            total_actual_hours=70,
            time_spent_this_week=25,
            time_spent_this_month=70,
            milestones=milestones,
            key_stakeholders=["Sam Leuthold (Developer)", "Claude API (Anthropic)"],
            success_criteria=[
                "Three-phase session intelligence working end-to-end", 
                "Hybrid voice model producing high-quality session logs",
                "Real-time checklist generation under 5 seconds",
                "Database integration storing all session artifacts",
                "Production API endpoints handling error cases gracefully"
            ],
            risks_and_blockers=[
                "Claude API rate limits during peak usage",
                "Structured output reliability with complex prompts",
                "Token costs scaling beyond budget constraints"
            ],
            recent_wins=[
                "Mock data foundation completed with realistic scenarios",
                "All three Claude services implemented with error handling",
                "Production API endpoints tested and validated",
                "Database schema supporting complex session intelligence"
            ],
            created_at=datetime(2025, 7, 20, 14, 0),
            updated_at=datetime.now(),
            metadata={
                "ai_provider": "Anthropic Claude Sonnet 3.5",
                "integration_pattern": "Three-phase session intelligence",
                "voice_model": "Hybrid (3rd person → 2nd person → 1st person)",
                "api_architecture": "RESTful with structured responses"
            }
        )
    
    def _create_echo_mobile_project(self) -> ProjectData:
        """Create Echo mobile project."""
        return ProjectData(
            id="echo_mobile",
            name="Echo Mobile Application",
            description="Native mobile application for Echo with session management and quick capture capabilities.",
            status=ProjectStatus.PLANNING,
            priority=ProjectPriority.MEDIUM,
            created_date=date(2025, 6, 1),
            target_completion=date(2025, 12, 1),
            category="development",
            tags=["mobile", "react-native", "ios", "android"],
            current_focus="Architecture planning and technology stack evaluation",
            progress_percentage=5.0,
            momentum="steady",
            total_estimated_hours=200,
            total_actual_hours=10,
            time_spent_this_week=2,
            time_spent_this_month=10,
            milestones=[],
            key_stakeholders=["Sam Leuthold (Developer)", "Mobile Users"],
            success_criteria=["Cross-platform compatibility", "Session quick-capture", "Offline functionality"],
            risks_and_blockers=["Time allocation", "Platform-specific requirements"],
            recent_wins=["Technology stack research completed"],
            created_at=datetime(2025, 6, 1, 11, 0),
            updated_at=datetime.now(),
            metadata={"status": "early_planning", "target_platforms": ["iOS", "Android"]}
        )
    
    def _create_soil_carbon_dynamics_project(self) -> ProjectData:
        """Create soil carbon dynamics research project."""
        milestones = [
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Literature Review",
                description="Comprehensive review of soil carbon sequestration literature",
                due_date=date(2025, 8, 15),
                status="in_progress",
                priority="high",
                estimated_hours=60,
                actual_hours=35,
                deliverables=[
                    "Literature database with 150+ papers",
                    "Systematic review methodology documentation",
                    "Key findings synthesis document"
                ]
            ),
            ProjectMilestone(
                id=str(uuid.uuid4()),
                title="Field Data Collection",
                description="Collect soil samples and environmental data from study sites",
                due_date=date(2025, 9, 30),
                status="pending",
                priority="critical",
                estimated_hours=80,
                deliverables=[
                    "Soil samples from 12 study sites",
                    "Environmental monitoring data",
                    "Site characterization reports"
                ]
            )
        ]
        
        return ProjectData(
            id="soil_carbon_dynamics",
            name="Soil Carbon Dynamics Study",
            description="Multi-year research project investigating soil carbon sequestration mechanisms and their response to environmental variability in temperate grassland ecosystems.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH,
            created_date=date(2024, 9, 1),
            target_completion=date(2026, 8, 31),
            category="research",
            tags=["soil-science", "carbon-cycle", "fieldwork", "analytics"],
            current_focus="Completing literature review and preparing for fall field season data collection",
            progress_percentage=40.0,
            momentum="steady",
            total_estimated_hours=400,
            total_actual_hours=160,
            time_spent_this_week=12,
            time_spent_this_month=35,
            milestones=milestones,
            key_stakeholders=["Dr. Sam Leuthold (PI)", "Graduate Students", "Field Site Managers"],
            success_criteria=[
                "Quantify carbon sequestration rates across environmental gradients",
                "Identify key microbial drivers of carbon dynamics",
                "Publish 3-4 high-impact papers",
                "Train 2 graduate students"
            ],
            risks_and_blockers=[
                "Weather delays for field sampling",
                "Equipment calibration issues",
                "Budget constraints for chemical analyses"
            ],
            recent_wins=[
                "Secured additional funding for analytical work",
                "Established collaboration with modeling team",
                "Completed methodological pilot studies"
            ],
            created_at=datetime(2024, 9, 1, 8, 0),
            updated_at=datetime.now(),
            metadata={
                "funding_source": "NSF DEB-2024567",
                "study_sites": 12,
                "collaboration": "Multi-institutional",
                "duration_years": 2
            }
        )
    
    def _create_microbial_ecology_project(self) -> ProjectData:
        """Create microbial ecology project."""
        return ProjectData(
            id="microbial_ecology_study",
            name="Microbial Ecology & Biogeochemistry",
            description="Investigation of microbial community structure and function in relation to soil biogeochemical processes.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.MEDIUM,
            created_date=date(2025, 1, 15),
            target_completion=date(2025, 12, 15),
            category="research",
            tags=["microbiology", "sequencing", "biogeochemistry"],
            current_focus="Sample processing and DNA extraction for community analysis",
            progress_percentage=30.0,
            momentum="steady",
            total_estimated_hours=250,
            total_actual_hours=75,
            time_spent_this_week=8,
            time_spent_this_month=22,
            milestones=[],
            key_stakeholders=["Sam Leuthold (PI)", "Lab Technicians", "Sequencing Core"],
            success_criteria=["Community analysis completed", "Functional gene quantification", "Publication draft"],
            risks_and_blockers=["Sequencing costs", "Sample degradation"],
            recent_wins=["Optimized extraction protocol", "Secured sequencing discounts"],
            created_at=datetime(2025, 1, 15, 9, 30),
            updated_at=datetime.now(),
            metadata={"sequencing_platform": "Illumina", "target_genes": ["16S", "ITS", "nifH"]}
        )
    
    def _create_climate_impact_study_project(self) -> ProjectData:
        """Create climate impact study project.""" 
        return ProjectData(
            id="climate_change_impact_study",
            name="Climate Change Impact Assessment",
            description="Assessing the impacts of projected climate change on soil ecosystem functioning and carbon storage.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.MEDIUM,
            created_date=date(2025, 2, 1),
            target_completion=date(2026, 1, 31),
            category="research",
            tags=["climate-change", "modeling", "ecosystem-function"],
            current_focus="Analyzing historical climate data and soil response patterns",
            progress_percentage=25.0,
            momentum="steady",
            total_estimated_hours=300, 
            total_actual_hours=75,
            time_spent_this_week=6,
            time_spent_this_month=18,
            milestones=[],
            key_stakeholders=["Sam Leuthold (Co-PI)", "Climate Modeling Team", "Ecosystem Modelers"],
            success_criteria=["Climate scenarios developed", "Impact projections completed", "Policy brief published"],
            risks_and_blockers=["Model uncertainty", "Data availability"],
            recent_wins=["Climate data partnership established", "Baseline analysis completed"],
            created_at=datetime(2025, 2, 1, 10, 0),
            updated_at=datetime.now(),
            metadata={"climate_models": ["CMIP6"], "scenarios": ["SSP2-4.5", "SSP5-8.5"]}
        )
    
    def _create_nsf_grant_project(self) -> ProjectData:
        """Create NSF grant project."""
        return ProjectData(
            id="nsf_grant_proposal",
            name="NSF Grant Proposal - Ecosystem Dynamics",
            description="Developing a major NSF proposal for ecosystem-scale carbon cycle research with advanced monitoring technologies.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH,
            created_date=date(2025, 4, 1),
            target_completion=date(2025, 9, 15),
            category="research",
            tags=["grant-writing", "nsf", "collaboration", "funding"],
            current_focus="Developing research methodology and budget with collaborating institutions",
            progress_percentage=50.0,
            momentum="accelerating",
            total_estimated_hours=120,
            total_actual_hours=60,
            time_spent_this_week=10,
            time_spent_this_month=30,
            milestones=[],
            key_stakeholders=["Sam Leuthold (Lead PI)", "Co-PIs", "Institution Grants Office"],
            success_criteria=["Proposal submitted on time", "Strong collaborative team", "Competitive budget"],
            risks_and_blockers=["Collaboration coordination", "Budget approval delays"],
            recent_wins=["Co-PI commitments secured", "Preliminary data analysis completed"],
            created_at=datetime(2025, 4, 1, 14, 30),
            updated_at=datetime.now(),
            metadata={"funding_amount": "$2.5M", "duration_years": 4, "collaborators": 5}
        )
    
    def _create_academic_writing_project(self) -> ProjectData:
        """Create academic writing project."""
        return ProjectData(
            id="academic_writing_portfolio",
            name="Academic Writing & Publications",
            description="Ongoing portfolio of academic publications, manuscript development, and scientific communication.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.MEDIUM,
            created_date=date(2025, 1, 1),
            target_completion=None,  # Ongoing
            category="personal",
            tags=["writing", "publications", "academic", "communication"],
            current_focus="Drafting two manuscripts and revising a third based on reviewer feedback",
            progress_percentage=60.0,
            momentum="steady",
            total_estimated_hours=200,
            total_actual_hours=120,
            time_spent_this_week=5,
            time_spent_this_month=20,
            milestones=[],
            key_stakeholders=["Sam Leuthold (Author)", "Co-authors", "Journal Editors"],
            success_criteria=["3 publications per year", "Clear scientific communication", "Timely responses to reviews"],
            risks_and_blockers=["Reviewer delays", "Co-author coordination"],
            recent_wins=["Manuscript accepted in Soil Biology & Biochemistry", "Positive reviewer feedback"],
            created_at=datetime(2025, 1, 1, 9, 0),
            updated_at=datetime.now(),
            metadata={"target_journals": ["SBB", "GCB", "PNAS"], "manuscripts_in_progress": 3}
        )
    
    def _create_lab_management_project(self) -> ProjectData:
        """Create lab management project."""
        return ProjectData(
            id="lab_management",
            name="Lab Management & Operations",
            description="Administrative and operational management of research laboratory, including equipment, safety, personnel, and project coordination.",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.MEDIUM,
            created_date=date(2025, 1, 1),
            target_completion=None,  # Ongoing
            category="personal",
            tags=["management", "lab-ops", "safety", "personnel"],
            current_focus="Equipment maintenance scheduling and new graduate student onboarding",
            progress_percentage=85.0,
            momentum="steady",
            total_estimated_hours=100,
            total_actual_hours=85,
            time_spent_this_week=4,
            time_spent_this_month=15,
            milestones=[],
            key_stakeholders=["Sam Leuthold (Lab Manager)", "Lab Members", "Safety Office"],
            success_criteria=["Safe lab operations", "Equipment uptime >95%", "Successful student development"],
            risks_and_blockers=["Equipment failures", "Safety compliance changes"],
            recent_wins=["New autoclave installed successfully", "Graduate student successfully defended"],
            created_at=datetime(2025, 1, 1, 8, 30),
            updated_at=datetime.now(),
            metadata={"lab_members": 6, "major_equipment": 12, "safety_incidents": 0}
        )
    
    def get_all_projects(self) -> List[ProjectData]:
        """Get all generated projects."""
        return self.projects
    
    def get_project_by_id(self, project_id: str) -> Optional[ProjectData]:
        """Get a specific project by ID."""
        for project in self.projects:
            if project.id == project_id:
                return project
        return None
    
    def get_projects_by_category(self, category: str) -> List[ProjectData]:
        """Get projects filtered by category."""
        return [p for p in self.projects if p.category == category]
    
    def get_active_projects(self) -> List[ProjectData]:
        """Get all active projects."""
        return [p for p in self.projects if p.status == ProjectStatus.ACTIVE]
    
    def get_high_priority_projects(self) -> List[ProjectData]:
        """Get high priority projects."""
        return [p for p in self.projects if p.priority in [ProjectPriority.HIGH, ProjectPriority.CRITICAL]]
    
    def get_projects_summary(self) -> Dict[str, Any]:
        """Get summary statistics of all projects."""
        total_projects = len(self.projects)
        active_projects = len(self.get_active_projects())
        high_priority = len(self.get_high_priority_projects())
        
        by_category = {}
        by_status = {}
        by_priority = {}
        
        for project in self.projects:
            # Count by category
            by_category[project.category] = by_category.get(project.category, 0) + 1
            
            # Count by status
            status_key = project.status.value
            by_status[status_key] = by_status.get(status_key, 0) + 1
            
            # Count by priority
            priority_key = project.priority.value
            by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
        
        return {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "high_priority_projects": high_priority,
            "by_category": by_category,
            "by_status": by_status,
            "by_priority": by_priority,
            "total_estimated_hours": sum(p.total_estimated_hours for p in self.projects),
            "total_actual_hours": sum(p.total_actual_hours for p in self.projects),
            "average_progress": sum(p.progress_percentage for p in self.projects) / total_projects if total_projects > 0 else 0
        }


# ===== TESTING AND DEVELOPMENT =====

if __name__ == "__main__":
    print("=== Mock Project Service Test ===")
    
    # Initialize service
    service = MockProjectService()
    projects = service.get_all_projects()
    
    print(f"Generated {len(projects)} mock projects:")
    print()
    
    # Display project summary
    summary = service.get_projects_summary()
    print("📊 Project Portfolio Summary:")
    print(f"  Total Projects: {summary['total_projects']}")
    print(f"  Active Projects: {summary['active_projects']}")
    print(f"  High Priority: {summary['high_priority_projects']}")
    print(f"  Total Estimated Hours: {summary['total_estimated_hours']}")
    print(f"  Average Progress: {summary['average_progress']:.1f}%")
    print()
    
    print("📋 By Category:")
    for category, count in summary['by_category'].items():
        print(f"  {category.title()}: {count}")
    print()
    
    print("🎯 By Priority:")
    for priority, count in summary['by_priority'].items():
        print(f"  {priority.title()}: {count}")
    print()
    
    # Show detailed info for a few key projects
    key_projects = ["echo_core", "echo_claude_integration", "soil_carbon_dynamics"]
    
    print("🔍 Key Project Details:")
    for project_id in key_projects:
        project = service.get_project_by_id(project_id)
        if project:
            print(f"\n📁 {project.name}")
            print(f"   Status: {project.status.value} | Priority: {project.priority.value}")
            print(f"   Progress: {project.progress_percentage}% | Momentum: {project.momentum}")
            print(f"   Focus: {project.current_focus}")
            print(f"   Milestones: {len(project.milestones)}")
            if project.milestones:
                for milestone in project.milestones[:2]:  # Show first 2
                    status_emoji = {"completed": "✅", "in_progress": "🔄", "pending": "⏳", "overdue": "⚠️"}.get(milestone.status, "📋")
                    print(f"     {status_emoji} {milestone.title} ({milestone.status})")
    
    print("\n✅ Mock project service test completed successfully!")
    print(f"✅ All {len(projects)} projects generated with comprehensive data")
    print("✅ Project relationships and hierarchies established")
    print("✅ Integration ready for session management and API endpoints")