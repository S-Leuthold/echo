/**
 * Tests for Today page data transformation functions
 * 
 * Tests the critical data transformation logic identified in CODEBASE_REVIEW_REPORT.md
 * Issue #10: Missing TypeScript Interfaces and data transformation reliability
 */

import { mockSchedule } from '@/mocks/scheduleData';

// Mock API response structure
interface MockTodayApiResponse {
  blocks: Array<{
    id: string;
    start_time: string;
    end_time: string;
    label: string;
    type: string;
    icon: string;
    project_name: string;
    task_name: string;
    duration: number;
    is_current: boolean;
    progress: number;
  }>;
  current_block?: {
    id: string;
    start_time: string;
    end_time: string;
    label: string;
    type: string;
  };
}

// Helper function to parse time strings (HH:MM) to object
const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// Category mapping function (from Today page)
const mapBlockTypeToCategory = (blockType: string, label: string = '') => {
  const lowerLabel = label.toLowerCase();
  
  // Check label content first for accurate categorization
  if (lowerLabel.includes('meeting') || lowerLabel.includes('standup') || lowerLabel.includes('call')) {
    return 'MEETINGS';
  }
  if (lowerLabel.includes('development') || lowerLabel.includes('code') || lowerLabel.includes('frontend') || lowerLabel.includes('backend')) {
    return 'DEEP_WORK';
  }
  if (lowerLabel.includes('research') || lowerLabel.includes('study') || lowerLabel.includes('learn')) {
    return 'RESEARCH';
  }
  if (lowerLabel.includes('exercise') || lowerLabel.includes('workout') || lowerLabel.includes('gym')) {
    return 'HEALTH';
  }
  if (lowerLabel.includes('lunch') || lowerLabel.includes('breakfast') || lowerLabel.includes('dinner')) {
    return 'MEALS';
  }
  if (lowerLabel.includes('personal') || lowerLabel.includes('break')) {
    return 'PERSONAL';
  }
  
  // Fallback to block type mapping
  switch (blockType.toLowerCase()) {
    case 'anchor':
    case 'fixed':
      return 'PERSONAL';
    case 'flex':
      return 'DEEP_WORK';
    default:
      return 'PERSONAL';
  }
};

// Data transformation function (simplified version from Today page)
const transformTodayDataToSchedule = (todayData: MockTodayApiResponse, currentTime: Date = new Date()) => {
  if (!todayData || !todayData.blocks) {
    return mockSchedule; // Fallback to mock if no blocks
  }
  
  return todayData.blocks.map((block, index) => {
    const startTime = parseTime(block.start_time);
    const endTime = parseTime(block.end_time);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    return {
      id: block.id || `block-${index}`,
      startTime: block.start_time,
      endTime: block.end_time,
      label: block.label || 'Untitled Block',
      timeCategory: mapBlockTypeToCategory(block.type, block.label),
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      isCurrent: currentMinutes >= startMinutes && currentMinutes < endMinutes,
      progress: block.progress || 0,
      emoji: block.icon || '📅',
      strategicNote: `Block: ${block.label}`,
      state: block.is_current ? 'active' : (startMinutes > currentMinutes ? 'upcoming' : 'completed')
    };
  });
};

describe('Today page data transformations', () => {
  const mockCurrentTime = new Date();
  mockCurrentTime.setHours(10, 30, 0, 0); // 10:30 AM

  describe('parseTime', () => {
    it('should parse time strings correctly', () => {
      expect(parseTime('09:00')).toEqual({ hours: 9, minutes: 0 });
      expect(parseTime('10:30')).toEqual({ hours: 10, minutes: 30 });
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('should handle single digit times', () => {
      expect(parseTime('9:00')).toEqual({ hours: 9, minutes: 0 });
      expect(parseTime('09:5')).toEqual({ hours: 9, minutes: 5 });
    });
  });

  describe('mapBlockTypeToCategory', () => {
    it('should map meeting labels correctly', () => {
      expect(mapBlockTypeToCategory('flex', 'Team standup meeting')).toBe('MEETINGS');
      expect(mapBlockTypeToCategory('anchor', 'Daily standup')).toBe('MEETINGS');
      expect(mapBlockTypeToCategory('fixed', 'Client call')).toBe('MEETINGS');
    });

    it('should map development labels correctly', () => {
      expect(mapBlockTypeToCategory('flex', 'Frontend development')).toBe('DEEP_WORK');
      expect(mapBlockTypeToCategory('anchor', 'Code review session')).toBe('DEEP_WORK');
      expect(mapBlockTypeToCategory('fixed', 'Backend API work')).toBe('DEEP_WORK');
    });

    it('should map research labels correctly', () => {
      expect(mapBlockTypeToCategory('flex', 'Research new frameworks')).toBe('RESEARCH');
      expect(mapBlockTypeToCategory('anchor', 'Study session')).toBe('RESEARCH');
      expect(mapBlockTypeToCategory('fixed', 'Learn TypeScript')).toBe('RESEARCH');
    });

    it('should map health labels correctly', () => {
      expect(mapBlockTypeToCategory('flex', 'Morning exercise')).toBe('HEALTH');
      expect(mapBlockTypeToCategory('anchor', 'Gym workout')).toBe('HEALTH');
    });

    it('should map meal labels correctly', () => {
      expect(mapBlockTypeToCategory('flex', 'Lunch break')).toBe('MEALS');
      expect(mapBlockTypeToCategory('anchor', 'Breakfast time')).toBe('MEALS');
      expect(mapBlockTypeToCategory('fixed', 'Dinner with family')).toBe('MEALS');
    });

    it('should fall back to block type mapping', () => {
      expect(mapBlockTypeToCategory('anchor', 'Unknown activity')).toBe('PERSONAL');
      expect(mapBlockTypeToCategory('fixed', 'Random task')).toBe('PERSONAL');
      expect(mapBlockTypeToCategory('flex', 'Unnamed block')).toBe('DEEP_WORK');
    });

    it('should handle unknown block types', () => {
      expect(mapBlockTypeToCategory('unknown', 'Some task')).toBe('PERSONAL');
    });
  });

  describe('transformTodayDataToSchedule', () => {
    const mockApiResponse: MockTodayApiResponse = {
      blocks: [
        {
          id: '1',
          start_time: '09:00',
          end_time: '10:00',
          label: 'Team standup meeting',
          type: 'fixed',
          icon: '🤝',
          project_name: 'Team',
          task_name: 'Standup',
          duration: 60,
          is_current: false,
          progress: 100
        },
        {
          id: '2',
          start_time: '10:00',
          end_time: '12:00',
          label: 'Frontend development',
          type: 'flex',
          icon: '💻',
          project_name: 'Echo',
          task_name: 'Development',
          duration: 120,
          is_current: true,
          progress: 50
        },
        {
          id: '3',
          start_time: '12:00',
          end_time: '12:30',
          label: 'Lunch break',
          type: 'anchor',
          icon: '🥪',
          project_name: 'Personal',
          task_name: 'Lunch',
          duration: 30,
          is_current: false,
          progress: 0
        }
      ]
    };

    it('should transform API data correctly', () => {
      const result = transformTodayDataToSchedule(mockApiResponse, mockCurrentTime);
      
      expect(result).toHaveLength(3);
      
      // Check first block
      expect(result[0]).toMatchObject({
        id: '1',
        startTime: '09:00',
        endTime: '10:00',
        label: 'Team standup meeting',
        timeCategory: 'MEETINGS',
        startMinutes: 540,
        endMinutes: 600,
        isCurrent: false,
        state: 'completed'
      });

      // Check second block (current)
      expect(result[1]).toMatchObject({
        id: '2',
        startTime: '10:00',
        endTime: '12:00',
        label: 'Frontend development',
        timeCategory: 'DEEP_WORK',
        startMinutes: 600,
        endMinutes: 720,
        isCurrent: true,
        state: 'active'
      });

      // Check third block (upcoming)
      expect(result[2]).toMatchObject({
        id: '3',
        startTime: '12:00',
        endTime: '12:30',
        label: 'Lunch break',
        timeCategory: 'MEALS',
        startMinutes: 720,
        endMinutes: 750,
        isCurrent: false,
        state: 'upcoming'
      });
    });

    it('should handle missing data gracefully', () => {
      const incompleteData: MockTodayApiResponse = {
        blocks: [
          {
            id: '',
            start_time: '10:00',
            end_time: '11:00',
            label: '',
            type: 'unknown',
            icon: '',
            project_name: '',
            task_name: '',
            duration: 60,
            is_current: false,
            progress: 0
          }
        ]
      };

      const result = transformTodayDataToSchedule(incompleteData, mockCurrentTime);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'block-0', // Generated ID
        label: 'Untitled Block', // Default label
        timeCategory: 'PERSONAL', // Default category
        emoji: '📅', // Default emoji
      });
    });

    it('should return empty array when no blocks provided', () => {
      const emptyData: MockTodayApiResponse = { blocks: [] };
      const result = transformTodayDataToSchedule(emptyData, mockCurrentTime);
      
      // Should return empty array since blocks exist but are empty
      expect(result).toEqual([]);
    });

    it('should fall back to mock data when no data provided', () => {
      const result = transformTodayDataToSchedule(null as any, mockCurrentTime);
      
      // Should return mock schedule
      expect(result).toBe(mockSchedule);
    });

    it('should determine current block correctly based on time', () => {
      const testTime = new Date();
      testTime.setHours(11, 0, 0, 0); // 11:00 AM - in the middle of development block
      
      const result = transformTodayDataToSchedule(mockApiResponse, testTime);
      
      expect(result[0].isCurrent).toBe(false); // 09:00-10:00
      expect(result[1].isCurrent).toBe(true);  // 10:00-12:00 (current time 11:00)
      expect(result[2].isCurrent).toBe(false); // 12:00-12:30
    });
  });

  describe('edge cases', () => {
    it('should handle blocks with same start and end time', () => {
      const edgeCaseData: MockTodayApiResponse = {
        blocks: [
          {
            id: '1',
            start_time: '10:00',
            end_time: '10:00',
            label: 'Quick check-in',
            type: 'flex',
            icon: '⚡',
            project_name: 'Team',
            task_name: 'Check-in',
            duration: 0,
            is_current: false,
            progress: 0
          }
        ]
      };

      const result = transformTodayDataToSchedule(edgeCaseData, mockCurrentTime);
      
      expect(result).toHaveLength(1);
      expect(result[0].startMinutes).toBe(result[0].endMinutes);
    });

    it('should handle blocks spanning midnight', () => {
      const midnightData: MockTodayApiResponse = {
        blocks: [
          {
            id: '1',
            start_time: '23:30',
            end_time: '00:30',
            label: 'Late night work',
            type: 'flex',
            icon: '🌙',
            project_name: 'Project',
            task_name: 'Work',
            duration: 60,
            is_current: false,
            progress: 0
          }
        ]
      };

      const result = transformTodayDataToSchedule(midnightData, mockCurrentTime);
      
      expect(result).toHaveLength(1);
      expect(result[0].startMinutes).toBe(23 * 60 + 30); // 23:30 = 1410 minutes
      expect(result[0].endMinutes).toBe(30); // 00:30 = 30 minutes (next day)
    });
  });
});