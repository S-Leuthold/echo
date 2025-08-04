/**
 * Simple Chart Component
 * 
 * Lightweight chart components for analytics without heavy dependencies
 */

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 200,
  showValues = true,
  className = ''
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxValue) * height;
          const percentage = Math.round((item.value / maxValue) * 100);
          
          return (
            <div key={idx} className="flex flex-col items-center flex-1 gap-2">
              <div
                className="w-full rounded transition-all duration-500 flex items-end justify-center text-xs font-medium"
                style={{
                  height: barHeight,
                  backgroundColor: item.color || 'rgb(230, 168, 108)', // accent color
                  minHeight: '4px'
                }}
              >
                {showValues && barHeight > 20 && (
                  <span className="text-black pb-1">
                    {item.value}
                  </span>
                )}
              </div>
              
              <div className="text-xs text-center text-muted-foreground">
                <div className="font-medium">{item.label}</div>
                {showValues && barHeight <= 20 && (
                  <div className="text-accent font-semibold">{item.value}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  height = 120,
  color = 'rgb(230, 168, 108)',
  showDots = true,
  className = ''
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return { x, y, value: item.value };
  });
  
  const pathD = points.reduce((path, point, idx) => {
    const command = idx === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');
  
  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="25" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 25" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border opacity-20"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Area under the curve */}
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill={color}
            opacity="0.1"
            className="transition-all duration-300"
          />
          
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-300"
          />
          
          {/* Dots */}
          {showDots && points.map((point, idx) => (
            <circle
              key={idx}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              className="transition-all duration-300"
            />
          ))}
        </svg>
        
        {/* Value labels */}
        <div className="absolute inset-0 flex items-end justify-between text-xs text-muted-foreground">
          {data.map((item, idx) => (
            <div key={idx} className="text-center" style={{ transform: 'translateY(20px)' }}>
              <div className="font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  innerRadius?: number;
  showLegend?: boolean;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 160,
  innerRadius = 0.6,
  showLegend = true,
  className = ''
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = center - 10;
  const innerR = radius * innerRadius;
  
  let currentAngle = -90; // Start from top
  
  const slices = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const x3 = center + innerR * Math.cos((endAngle * Math.PI) / 180);
    const y3 = center + innerR * Math.sin((endAngle * Math.PI) / 180);
    const x4 = center + innerR * Math.cos((startAngle * Math.PI) / 180);
    const y4 = center + innerR * Math.sin((startAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');
    
    currentAngle += angle;
    
    return {
      ...item,
      pathData,
      percentage
    };
  });
  
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative">
        <svg width={size} height={size}>
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          ))}
        </svg>
        
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total}h</div>
            <div className="text-xs text-muted-foreground">total</div>
          </div>
        </div>
      </div>
      
      {showLegend && (
        <div className="space-y-2">
          {slices.map((slice, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: slice.color }}
              />
              <div className="text-sm">
                <div className="font-medium">{slice.label}</div>
                <div className="text-muted-foreground text-xs">
                  {slice.value}h ({Math.round(slice.percentage)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};