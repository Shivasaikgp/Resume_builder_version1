# Project Structure & Organization

## Repository Layout

```
├── .kiro/                    # Kiro configuration and specs
│   ├── specs/               # Feature specifications
│   │   └── resume-builder/  # Resume builder requirements
│   └── steering/            # AI assistant guidance documents
├── zety.md                  # Product reference and inspiration
└── .git/                    # Git repository
```

## Planned Application Structure

Based on the requirements, the application should be organized with these key areas:

### Core Components
- **AI Agents**: Content generation, analysis, and context management
- **Template System**: Single adaptive template with intelligent layout
- **Document Processing**: PDF/Word export and resume parsing
- **User Interface**: Streamlined workflow with real-time preview

### Suggested Organization Patterns

#### AI Agent Architecture
- Separate agents for different functions (content, analysis, context)
- Shared context management system
- Modular suggestion and recommendation engines

#### Template System
- Single base template with adaptive components
- Layout logic that responds to content type and experience level
- Consistent styling with intelligent adjustments

#### Document Management
- Version control for multiple resume variants
- Export functionality with format preservation
- Import/parsing capabilities for existing resumes

## Development Conventions

### File Naming
- Use descriptive, consistent naming for AI agent modules
- Separate concerns clearly (content generation vs. analysis vs. context)
- Group related functionality logically

### Code Organization
- Keep AI logic modular and testable
- Separate business logic from UI components
- Maintain clear interfaces between different system components

### Documentation
- Document AI agent behavior and decision logic
- Maintain clear API documentation for AI services
- Keep requirements and specifications up to date

## Key Architectural Principles

1. **Modularity**: AI agents should be independent and composable
2. **Context Awareness**: Maintain user context across all interactions
3. **Real-time Performance**: Optimize for live preview and scoring
4. **Adaptability**: Template and suggestions should respond to user content
5. **Consistency**: Maintain coherent experience across resume versions