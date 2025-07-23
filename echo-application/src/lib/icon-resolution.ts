import { 
  BookOpen, 
  Dumbbell, 
  Sandwich, 
  Users, 
  Coffee,
  Car,
  Plane,
  ShoppingCart,
  Phone,
  Mail,
  Briefcase,
  Code,
  PenTool,
  Calendar,
  HeartPulse,
  Brain,
  Utensils,
  Gamepad2,
  Music,
  Camera,
  Sparkles,
  Dog,
  Baby,
  GraduationCap,
  Stethoscope,
  Hammer,
  Palette,
  TreePine,
  Bed,
  Clock,
  Target,
  Zap,
  HelpCircle,
  Rocket,
  Lightbulb,
  type LucideIcon
} from "lucide-react";

// Comprehensive keyword to icon mapping - more specific keywords prioritized
const keywordIconMap: Record<string, LucideIcon> = {
  // Reading & Learning
  'reading': BookOpen,
  'read': BookOpen,
  'book': BookOpen,
  'study': GraduationCap,
  'studying': GraduationCap,
  'learning': GraduationCap,
  'course': GraduationCap,
  'class': GraduationCap,
  'research': Brain,
  
  // Fitness & Health
  'workout': Dumbbell,
  'exercise': Dumbbell,
  'gym': Dumbbell,
  'run': Dumbbell,
  'running': Dumbbell,
  'yoga': HeartPulse,
  'meditation': HeartPulse,
  'doctor': Stethoscope,
  'appointment': Stethoscope,
  'health': HeartPulse,
  
  // Food & Meals
  'breakfast': Coffee,
  'lunch': Sandwich,
  'dinner': Utensils,
  'meal': Utensils,
  'eating': Utensils,
  'cooking': Utensils,
  'grocery': ShoppingCart,
  'shopping': ShoppingCart,
  'coffee': Coffee,
  'drink': Coffee,
  
  // Work & Professional
  'meeting': Users,
  'standup': Users,
  'conference': Users,
  'call': Phone,
  'zoom': Users,
  'email': Mail,
  'work': Briefcase,
  'coding': Code,
  'development': Code,
  'programming': Code,
  'writing': PenTool,
  'planning': Calendar,
  'admin': Briefcase,
  
  // Transportation
  'commute': Car,
  'drive': Car,
  'driving': Car,
  'travel': Plane,
  'flight': Plane,
  'car': Car,
  'uber': Car,
  'lyft': Car,
  
  // Personal & Home
  'cleaning': Sparkles,
  'laundry': Sparkles,
  'shower': Sparkles,
  'sleep': Bed,
  'nap': Bed,
  'rest': Bed,
  'routine': Clock,
  'morning': Clock,
  'evening': Clock,
  
  // Family & Social
  'family': Users,
  'kids': Baby,
  'children': Baby,
  'baby': Baby,
  'pet': Dog,
  'dog': Dog,
  'cat': Dog,
  'social': Users,
  'friends': Users,
  'date': Users,
  
  // Entertainment & Hobbies
  'music': Music,
  'piano': Music,
  'guitar': Music,
  'gaming': Gamepad2,
  'games': Gamepad2,
  'photography': Camera,
  'photo': Camera,
  'art': Palette,
  'painting': Palette,
  'drawing': Palette,
  'hobby': Palette,
  
  // Outdoor & Nature
  'walk': TreePine,
  'walking': TreePine,
  'hike': TreePine,
  'hiking': TreePine,
  'outdoor': TreePine,
  'nature': TreePine,
  'park': TreePine,
  
  // Home Improvement & Maintenance
  'repair': Hammer,
  'fix': Hammer,
  'maintenance': Hammer,
  'diy': Hammer,
  'project': Hammer,
  'build': Hammer,
  'construction': Hammer
};

// Direct Lucide icon name mapping (for backend-generated icon names)
const lucideNameIconMap: Record<string, LucideIcon> = {
  'Rocket': Rocket,
  'Lightbulb': Lightbulb,
  'Zap': Zap,
  'Target': Target,
  'Calendar': Calendar,
  'Brain': Brain,
  'Users': Users,
  'Code': Code,
  'Briefcase': Briefcase,
  'BookOpen': BookOpen,
  'Dumbbell': Dumbbell,
  'Coffee': Coffee,
  'Mail': Mail,
  'Phone': Phone,
  'Car': Car,
  'Plane': Plane,
  'Clock': Clock,
  'HeartPulse': HeartPulse,
  'Utensils': Utensils,
  'PenTool': PenTool,
  'Music': Music,
  'Camera': Camera,
  'Sparkles': Sparkles,
  'Hammer': Hammer,
  'Palette': Palette,
  'TreePine': TreePine,
  'Bed': Bed,
  'HelpCircle': HelpCircle
};

// Category fallback mapping
const categoryIconMap: Record<string, LucideIcon> = {
  'deep_work': Brain,
  'shallow_work': Briefcase,
  'meetings': Users,
  'personal': Clock,
  'health': HeartPulse,
  'meals': Utensils,
  'transit': Car,
  'planning': Calendar,
  'research': Brain,
  'admin': Briefcase,
  'work': Briefcase,
  'exercise': Dumbbell,
  'learning': GraduationCap,
  'writing': PenTool,
  'social': Users,
  'rest': Bed
};

export interface IconResolutionResult {
  icon: LucideIcon;
  source: 'lucide_name' | 'keyword' | 'category' | 'fallback';
  matchedTerm?: string;
}

export class IconResolutionService {
  /**
   * Resolves icon from backend-generated Lucide icon name
   * @param iconName - The Lucide icon name from the backend
   * @returns IconResolutionResult with the icon and metadata
   */
  static resolveIconByName(iconName: string): IconResolutionResult {
    if (lucideNameIconMap[iconName]) {
      return {
        icon: lucideNameIconMap[iconName],
        source: 'lucide_name',
        matchedTerm: iconName
      };
    }
    
    // Fallback if icon name not found
    return {
      icon: HelpCircle,
      source: 'fallback'
    };
  }

  /**
   * Resolves the most appropriate icon for a time block
   * @param title - The block's title/name
   * @param category - The block's category
   * @param iconName - Optional direct icon name from backend
   * @returns IconResolutionResult with the icon and metadata
   */
  static resolveIcon(title: string, category: string, iconName?: string): IconResolutionResult {
    // Step 0: If we have a direct icon name from backend, use it
    if (iconName) {
      return this.resolveIconByName(iconName);
    }
    // Step 1: Try to match keywords in title (case insensitive)
    const titleLower = title.toLowerCase();
    
    // Sort keywords by length (longest first) to prioritize more specific matches
    const sortedKeywords = Object.keys(keywordIconMap).sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
      if (titleLower.includes(keyword)) {
        return {
          icon: keywordIconMap[keyword],
          source: 'keyword',
          matchedTerm: keyword
        };
      }
    }
    
    // Step 2: Fallback to category mapping
    const categoryLower = category.toLowerCase();
    if (categoryIconMap[categoryLower]) {
      return {
        icon: categoryIconMap[categoryLower],
        source: 'category',
        matchedTerm: categoryLower
      };
    }
    
    // Step 3: Final fallback
    return {
      icon: HelpCircle,
      source: 'fallback'
    };
  }

  /**
   * Get all available keyword mappings (for debugging/development)
   */
  static getKeywordMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    Object.entries(keywordIconMap).forEach(([keyword, IconComponent]) => {
      mappings[keyword] = IconComponent.name || 'Unknown';
    });
    return mappings;
  }

  /**
   * Get all available category mappings (for debugging/development)
   */
  static getCategoryMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    Object.entries(categoryIconMap).forEach(([category, IconComponent]) => {
      mappings[category] = IconComponent.name || 'Unknown';
    });
    return mappings;
  }
}