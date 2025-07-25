# Echo React TypeScript Application

The Echo React application is a sophisticated Next.js frontend that provides an elegant evening ritual interface for daily planning and reflection. This application represents the culmination of Echo's wizard-based planning system, offering users a seamless transition from day review through reflection to intelligent plan generation.

## 🌟 Features

### Evening Ritual Wizard
A comprehensive multi-step workflow that guides users through:
- **Day Review**: Visual timeline of productivity with analytics integration
- **Guided Reflection**: Progressive disclosure journaling with three reflection prompts
- **Context Briefing**: Intelligent briefing combining email, calendar, and session insights
- **Planning Prompts**: User intention capture with energy level and work environment
- **Generated Plan**: AI-powered schedule generation with user configuration integration

### Today Page Interface
- **Two-Column Layout**: Slack/Discord-inspired layout with 70/30 split (content/calendar)
- **Dynamic Timeline**: Smart calendar that adapts to actual schedule data with buffered time ranges
- **Session Management**: Interactive session controls with real-time progress tracking
- **Full-Height Calendar**: Fixed right sidebar using complete viewport height for optimal timeline scaling
- **Perfect Header Alignment**: Unified grid system ensuring visual cohesion across page elements

### Weekly Calendar Interface
- **Interactive Calendar**: Sophisticated drag-and-drop weekly calendar component
- **Config Wizard**: Modal-based configuration editor with auto-save functionality
- **Time Block Management**: Visual representation of anchors, fixed events, and flex time
- **Category Color Coding**: Visual distinction between personal, work, exercise, and meal blocks

### Advanced UI Components
- **Lucide Icon System**: Complete migration from emoji to Lucide React icons
- **Premium Styling**: Serif fonts, custom inputs, smooth animations, and elegant transitions
- **Responsive Design**: Mobile-first design with desktop enhancements
- **Dark Mode Support**: Integrated with Next.js theme system

## 🏗️ Architecture

### Core Technologies
- **Next.js 14**: App router with React Server Components
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first styling with custom design system
- **Lucide React**: Consistent icon system with 1000+ icons
- **Shadcn/ui**: Premium UI component library

### Key Components

#### Planning Wizard (`/app/planning/page.tsx`)
The main wizard interface containing:
- `WelcomeStep`: Elegant entry point with call-to-action
- `DayReviewStep`: Analytics-driven day review with timeline visualization
- `JournalStep`: Progressive disclosure reflection prompts
- `HabitsStep`: Placeholder for future habit tracking integration
- `ContextBriefingStep`: Intelligent briefing display with markdown rendering
- `PlanningPromptsStep`: User intention capture with energy/environment selection
- `GeneratedPlanStep`: AI schedule generation with config integration

#### Today Page (`/app/today/page.tsx`)
- **Real-time Dashboard**: Session-aware interface with live progress tracking
- **Current Focus Component**: Expandable session hub with note-taking capabilities
- **Dynamic Layout**: CSS Grid-based two-column layout for optimal space utilization
- **Smart Timeline Integration**: Uses shared PlanTimeline component with dynamic time range calculation

#### Shared PlanTimeline (`/components/shared/PlanTimeline.tsx`)
- **Context-Aware Rendering**: Adapts behavior for 'planning' vs 'today' contexts
- **Dynamic Time Range Calculation**: Analyzes schedule data to determine optimal display bounds
- **Mathematical Timeline Scaling**: Perfect-fit calculations for any schedule length
- **Category-Based Styling**: Outline-based blocks with TimeCategory color coding
- **Real-time Features**: Current time indicator and live progress updates

#### Weekly Calendar (`/components/weekly-calendar.tsx`)
- Sophisticated drag-and-drop interface
- Modal configuration editor
- Real-time visual feedback
- Auto-save functionality
- Time conflict detection

#### Configuration System
- YAML-based user configuration loading
- Weekly schedule management
- Project and profile system integration
- Dynamic config validation

## 🔧 Configuration Integration

### User Config Integration
The application seamlessly integrates with Echo's YAML configuration system:

```yaml
weekly_schedule:
  monday:
    anchors:
      - time: "05:30–06:00"
        task: Morning Reading
        category: personal
    fixed: []
    flex:
      - time: "12:30–13:00"
        task: Lunch
        category: meals
```

### API Integration
- **FastAPI Backend**: Seamless integration with Python backend
- **Real-time Config Loading**: `/config/load` endpoint integration
- **Plan Generation**: `/plan` endpoint with full context passing
- **Analytics Integration**: `/analytics` endpoint for day review data
- **Context Briefing**: `/context-briefing` endpoint for intelligent briefing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for Next.js 14 compatibility)
- Echo Python backend running on `localhost:8000`
- User configuration file at `config/user_config.yaml`

### Installation
```bash
cd echo-application
npm install
```

### Development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
echo-application/
├── src/
│   ├── app/
│   │   ├── planning/
│   │   │   └── page.tsx          # Main wizard interface
│   │   ├── config-wizard/
│   │   │   └── page.tsx          # Configuration wizard
│   │   ├── globals.css           # Global styles
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui components
│   │   └── weekly-calendar.tsx   # Calendar component
│   └── lib/
│       └── icon-resolution.ts    # Lucide icon mapping
├── public/                       # Static assets
├── tailwind.config.js           # Tailwind configuration
├── next.config.js              # Next.js configuration
└── package.json                # Dependencies
```

## 🎯 Key Features in Detail

### Intelligent Plan Generation
The wizard integrates user configuration, real-time context, and AI planning:
1. Loads user's weekly schedule and anchors
2. Extracts today's fixed events and constraints
3. Combines user intentions with system context
4. Generates optimized schedule respecting all constraints
5. Displays compact timeline view with icons and duration

### Config-Driven Scheduling
- **Anchors**: Non-negotiable time blocks (exercise, meals, routines)
- **Fixed Events**: Specific scheduled appointments
- **Flex Time**: Adaptable blocks for focused work
- **Project Integration**: Active projects inform task prioritization

### Progressive Disclosure UX
The wizard uses progressive disclosure to reduce cognitive load:
- Single-focus screens with clear progress indication
- Contextual help and guidance
- Smooth transitions between steps
- Elegant loading states and feedback

## 🔗 API Integration

### Backend Endpoints
- `GET /analytics` - Day review analytics data
- `GET /context-briefing` - Intelligent daily briefing
- `GET /config/load` - User configuration loading
- `POST /plan` - AI-powered plan generation

### Data Flow
1. **Day Review**: Fetches analytics for timeline visualization
2. **Journal**: Captures reflection data locally
3. **Context Briefing**: Displays email, calendar, and session intelligence
4. **Planning**: Loads config, captures intentions, generates plan
5. **Plan Storage**: Saves generated plan to localStorage and server

## 🚧 Current Status

### Completed Features ✅
- Complete evening ritual wizard (7 steps)
- Weekly calendar with configuration editor
- Lucide icon migration (1000+ icons available)
- User configuration integration
- AI plan generation with context
- Premium UI with animations and transitions
- Responsive design for all screen sizes

### Pending Tasks 📋
- Latency optimization with caching
- Manual plan adjustments for today view
- Morning spin-up workflow
- Plan change logging and context tracking
- Enhanced error handling and validation

## 🎨 Design System

### Typography
- **Headings**: Inter font family for clarity
- **Body**: System fonts for readability
- **Accent**: Serif fonts for elegance (titles, quotes)

### Colors
- **Primary**: Tailwind accent system
- **Categories**: 
  - Personal: Blue tones
  - Work: Green tones  
  - Exercise: Red tones
  - Meals: Orange tones

### Spacing & Layout
- **Container Max Width**: 4xl (896px)
- **Grid System**: CSS Grid and Flexbox
- **Responsive Breakpoints**: sm, md, lg, xl

## 🛠️ Development

### TypeScript Configuration
Full type safety with strict mode enabled:
- Props interfaces for all components
- API response type definitions
- Configuration object typing
- Event handler type safety

### State Management
- React hooks for local state
- Wizard state management with step transitions
- Form state with validation
- API state with loading indicators

### Performance Optimizations
- Next.js Image optimization
- Component lazy loading
- API response caching
- Bundle size optimization with tree shaking

## 📱 Mobile Support

The application is fully responsive with mobile-first design:
- Touch-optimized interactions
- Mobile-friendly navigation
- Responsive typography scaling
- Mobile keyboard optimization

## 🔮 Future Enhancements

### Short Term
- Real-time collaboration features
- Enhanced mobile gestures
- Offline support with service workers
- Advanced animation system

### Long Term  
- Native mobile app (React Native)
- Desktop app (Electron)
- Advanced theming system
- Plugin architecture for extensions

---

**Current Version**: Production Ready  
**Last Updated**: January 2025  
**Next.js Version**: 14.x  
**React Version**: 18.x