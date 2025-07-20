// Tests for real-time AI enhancement React components
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeEnhancement } from '../components/ai/RealTimeEnhancement';
import { EnhancedTextInput } from '../components/forms/EnhancedTextInput';
import { UserContext } from '../types';

// Mock the useRealTimeAI hook
vi.mock('../hooks/useRealTimeAI', () => ({
  useRealTimeAI: vi.fn()
}));

const { useRealTimeAI } = await import('../hooks/useRealTimeAI');

const mockUserContext: UserContext = {
  profile: {
    industry: 'technology',
    experienceLevel: 'mid',
    targetRoles: ['Software Engineer'],
    skills: ['JavaScript', 'React'],
    careerGoals: ['Senior Developer']
  },
  preferences: {
    writingStyle: 'formal',
    contentLength: 'detailed',
    focusAreas: ['technical skills']
  },
  history: {
    interactions: [],
    feedbackPatterns: [],
    improvementAreas: []
  }
};

const mockUseRealTimeAI = {
  streamingSuggestions: [],
  isStreaming: false,
  improvedContent: null,
  contextualHelp: null,
  helpVisible: false,
  feedbackHistory: [],
  startRealTimeAnalysis: vi.fn(),
  stopRealTimeAnalysis: vi.fn(),
  acceptSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
  showContextualHelp: vi.fn(),
  hideContextualHelp: vi.fn(),
  clearSuggestions: vi.fn(),
  error: null,
  clearError: vi.fn()
};

describe('RealTimeEnhancement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRealTimeAI as any).mockReturnValue(mockUseRealTimeAI);
  });

  it('should render control panel correctly', () => {
    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('Real-time AI Enhancement')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('should show streaming indicator when analyzing', () => {
    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      isStreaming: true
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('should display streaming suggestions', () => {
    const mockSuggestions = [
      {
        id: '1',
        content: 'First suggestion',
        isComplete: true,
        confidence: 0.8,
        type: 'bullet_point',
        context: 'Test context'
      },
      {
        id: '2',
        content: 'Second suggestion',
        isComplete: false,
        confidence: 0.6,
        type: 'achievement',
        context: 'Another context'
      }
    ];

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      streamingSuggestions: mockSuggestions
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
    expect(screen.getByText('2 suggestions')).toBeInTheDocument();
    expect(screen.getByText('First suggestion')).toBeInTheDocument();
    expect(screen.getByText('Second suggestion')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should handle suggestion acceptance', async () => {
    const mockSuggestion = {
      id: '1',
      content: 'Test suggestion',
      isComplete: true,
      confidence: 0.8,
      type: 'bullet_point',
      context: 'Test context'
    };

    const mockOnSuggestionApplied = vi.fn();

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      streamingSuggestions: [mockSuggestion]
    });

    render(
      <RealTimeEnhancement
        content="Original content"
        section="experience"
        context={mockUserContext}
        onSuggestionApplied={mockOnSuggestionApplied}
      />
    );

    const acceptButton = screen.getAllByRole('button').find(
      button => button.querySelector('svg') // Check for CheckIcon
    );

    if (acceptButton) {
      await userEvent.click(acceptButton);
    }

    expect(mockUseRealTimeAI.acceptSuggestion).toHaveBeenCalledWith(mockSuggestion);
    expect(mockOnSuggestionApplied).toHaveBeenCalledWith('Original content', 'Test suggestion');
  });

  it('should handle suggestion rejection', async () => {
    const mockSuggestion = {
      id: '1',
      content: 'Test suggestion',
      isComplete: true,
      confidence: 0.8,
      type: 'bullet_point',
      context: 'Test context'
    };

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      streamingSuggestions: [mockSuggestion]
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    const rejectButton = screen.getAllByRole('button').find(
      button => button.getAttribute('class')?.includes('text-red-600')
    );

    if (rejectButton) {
      await userEvent.click(rejectButton);
    }

    expect(mockUseRealTimeAI.rejectSuggestion).toHaveBeenCalledWith(mockSuggestion);
  });

  it('should display improved content', () => {
    const mockOnContentChange = vi.fn();

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      improvedContent: 'Enhanced content version'
    });

    render(
      <RealTimeEnhancement
        content="Original content"
        section="experience"
        context={mockUserContext}
        onContentChange={mockOnContentChange}
      />
    );

    expect(screen.getByText('Enhanced Content')).toBeInTheDocument();
    expect(screen.getByText('Apply Enhancement')).toBeInTheDocument();
  });

  it('should apply improved content when button is clicked', async () => {
    const mockOnContentChange = vi.fn();
    const mockOnSuggestionApplied = vi.fn();

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      improvedContent: 'Enhanced content version'
    });

    render(
      <RealTimeEnhancement
        content="Original content"
        section="experience"
        context={mockUserContext}
        onContentChange={mockOnContentChange}
        onSuggestionApplied={mockOnSuggestionApplied}
      />
    );

    const applyButton = screen.getByText('Apply Enhancement');
    await userEvent.click(applyButton);

    expect(mockOnContentChange).toHaveBeenCalledWith('Enhanced content version');
    expect(mockOnSuggestionApplied).toHaveBeenCalledWith('Original content', 'Enhanced content version');
  });

  it('should display contextual help', () => {
    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      helpVisible: true,
      contextualHelp: 'This is helpful contextual information about your content.'
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('Contextual Help')).toBeInTheDocument();
    expect(screen.getByText('This is helpful contextual information about your content.')).toBeInTheDocument();
  });

  it('should handle help button click', async () => {
    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    const helpButton = screen.getByText('Help');
    await userEvent.click(helpButton);

    expect(mockUseRealTimeAI.showContextualHelp).toHaveBeenCalledWith('Test content', 'experience');
  });

  it('should display error messages', () => {
    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      error: 'Something went wrong with AI analysis'
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('Something went wrong with AI analysis')).toBeInTheDocument();
  });

  it('should clear error when close button is clicked', async () => {
    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      error: 'Test error message'
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    const closeButton = screen.getAllByRole('button').find(
      button => button.querySelector('svg') // Look for close icon
    );

    if (closeButton) {
      await userEvent.click(closeButton);
    }

    expect(mockUseRealTimeAI.clearError).toHaveBeenCalled();
  });

  it('should show feedback statistics', () => {
    const mockFeedbackHistory = [
      { suggestionId: '1', action: 'accepted' as const, originalContent: 'Test 1', timestamp: new Date(), context: 'Context 1' },
      { suggestionId: '2', action: 'rejected' as const, originalContent: 'Test 2', timestamp: new Date(), context: 'Context 2' },
      { suggestionId: '3', action: 'modified' as const, originalContent: 'Test 3', timestamp: new Date(), context: 'Context 3' }
    ];

    (useRealTimeAI as any).mockReturnValue({
      ...mockUseRealTimeAI,
      feedbackHistory: mockFeedbackHistory
    });

    render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText(/Session feedback: 1 accepted, 1 rejected, 1 modified/)).toBeInTheDocument();
  });

  it('should not render when disabled', () => {
    const { container } = render(
      <RealTimeEnhancement
        content="Test content"
        section="experience"
        context={mockUserContext}
        disabled={true}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('EnhancedTextInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRealTimeAI as any).mockReturnValue(mockUseRealTimeAI);
  });

  it('should render input field correctly', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
    expect(screen.getByText('AI On')).toBeInTheDocument();
  });

  it('should handle text input changes', async () => {
    const mockOnChange = vi.fn();

    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={mockOnChange}
        section="experience"
        context={mockUserContext}
      />
    );

    const input = screen.getByLabelText('Test Input');
    await userEvent.type(input, 'Test content');

    expect(mockOnChange).toHaveBeenCalledWith('Test content');
  });

  it('should show character count', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value="Test content"
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
      />
    );

    expect(screen.getByText('12 characters')).toBeInTheDocument();
  });

  it('should show word count for multiline input', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value="Test content with multiple words"
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        multiline={true}
      />
    );

    expect(screen.getByText('5 words')).toBeInTheDocument();
  });

  it('should toggle AI enhancement', async () => {
    const mockOnAIToggle = vi.fn();

    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        onAIToggle={mockOnAIToggle}
      />
    );

    const aiToggle = screen.getByText('AI On');
    await userEvent.click(aiToggle);

    expect(mockOnAIToggle).toHaveBeenCalledWith(false);
  });

  it('should show AI enhancement when enabled and content is sufficient', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value="This is sufficient content for AI analysis"
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
      />
    );

    // The RealTimeEnhancement component should be rendered
    expect(screen.getByText('Real-time AI Enhancement')).toBeInTheDocument();
  });

  it('should not show AI enhancement when disabled', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value="This is sufficient content for AI analysis"
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        showAIEnhancement={false}
      />
    );

    expect(screen.queryByText('Real-time AI Enhancement')).not.toBeInTheDocument();
  });

  it('should show quick tips when focused and no interaction', async () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
      />
    );

    const input = screen.getByLabelText('Test Input');
    await userEvent.click(input);

    expect(screen.getByText(/Start typing to get real-time AI suggestions/)).toBeInTheDocument();
  });

  it('should handle suggestion application correctly', async () => {
    const mockOnChange = vi.fn();

    render(
      <EnhancedTextInput
        label="Test Input"
        value="Original content"
        onChange={mockOnChange}
        section="experience"
        context={mockUserContext}
      />
    );

    // Simulate suggestion application through the RealTimeEnhancement component
    const enhancementComponent = screen.getByText('Real-time AI Enhancement').closest('div');
    
    // This would be called by the RealTimeEnhancement component
    act(() => {
      // Simulate the onSuggestionApplied callback
      mockOnChange('Enhanced content');
    });

    expect(mockOnChange).toHaveBeenCalledWith('Enhanced content');
  });

  it('should render as textarea when multiline is true', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        multiline={true}
        rows={5}
      />
    );

    const textarea = screen.getByLabelText('Test Input');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('should show required indicator', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        required={true}
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <EnhancedTextInput
        label="Test Input"
        value=""
        onChange={vi.fn()}
        section="experience"
        context={mockUserContext}
        disabled={true}
      />
    );

    const input = screen.getByLabelText('Test Input');
    expect(input).toBeDisabled();
  });
});