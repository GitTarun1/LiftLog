import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { IOSSegmentedControl } from './IOSSegmentedControl';

export interface ChartDataPoint {
  label: string; // e.g. 'W1', 'W2', or 'Sep', 'Oct'
  value: number; // weight in kg/lbs
  dateStr: string; // '2026-09-15'
  subtext?: string;
}

interface IOSChartProps {
  data: ChartDataPoint[];
  unit: string;
  timeframe: 'weeks' | 'months';
  onTimeframeChange: (tf: 'weeks' | 'months') => void;
  accentColor?: string;
  emptyMessage?: string;
}

export function IOSChart({
  data,
  unit,
  timeframe,
  onTimeframeChange,
  accentColor,
  emptyMessage = 'No workout data logged yet.',
}: IOSChartProps) {
  const theme = useTheme();
  const color = accentColor || theme.tint;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 64, 400);
  const chartHeight = 180;
  const paddingLeft = 38;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { borderColor: theme.border }]}>
        <View style={styles.segmentWrapper}>
          <IOSSegmentedControl
            options={[
              { label: 'Weeks', value: 'weeks' },
              { label: 'Months', value: 'months' },
            ]}
            selectedValue={timeframe}
            onValueChange={onTimeframeChange}
          />
        </View>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  // Calculate min and max for Y scale
  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || 10;
  const yMin = Math.floor(rawMin - range * 0.15);
  const yMax = Math.ceil(rawMax + range * 0.15);
  const effectiveRange = yMax - yMin || 1;

  // Coordinate projection
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - ((val - yMin) / effectiveRange) * innerHeight;
  };

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    point: d,
    index: i,
  }));

  // Build SVG path
  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
  } else {
    pathD = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  }

  // Gradient area path
  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${
          paddingTop + innerHeight
        } Z`
      : '';

  // Stats
  const latestPoint = data[data.length - 1];
  const firstPoint = data[0];
  const diff = latestPoint.value - firstPoint.value;
  const maxPoint = Math.max(...values);
  const selectedPoint = selectedIndex !== null ? data[selectedIndex] : latestPoint;

  // Y-axis grid ticks (3 ticks)
  const yTicks = [
    { val: yMax, y: paddingTop },
    { val: Math.round((yMax + yMin) / 2), y: paddingTop + innerHeight / 2 },
    { val: yMin, y: paddingTop + innerHeight },
  ];

  return (
    <View style={styles.container}>
      {/* Top Controls & Metrics */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
            {selectedPoint.dateStr}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.mainValue, { color: theme.text }]}>
              {selectedPoint.value}
            </Text>
            <Text style={[styles.unitText, { color: theme.textSecondary }]}>
              {' '}{unit}
            </Text>
            {data.length > 1 && (
              <View
                style={[
                  styles.changeBadge,
                  {
                    backgroundColor:
                      diff >= 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.changeText,
                    { color: diff >= 0 ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {unit}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeframe Segmented Control */}
        <View style={styles.segmentControlWrapper}>
          <IOSSegmentedControl
            options={[
              { label: 'Weeks', value: 'weeks' },
              { label: 'Months', value: 'months' },
            ]}
            selectedValue={timeframe}
            onValueChange={onTimeframeChange}
          />
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Gridlines & Y-labels */}
          {yTicks.map((tick, i) => (
            <React.Fragment key={i}>
              <Line
                x1={paddingLeft}
                y1={tick.y}
                x2={chartWidth - paddingRight}
                y2={tick.y}
                stroke={theme.border}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <SvgText
                x={paddingLeft - 6}
                y={tick.y + 4}
                fill={theme.textSecondary}
                fontSize="10"
                fontWeight="500"
                textAnchor="end"
              >
                {tick.val}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Area fill */}
          {areaD ? <Path d={areaD} fill="url(#chartGradient)" /> : null}

          {/* Line path */}
          <Path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, i) => {
            const isSelected = selectedIndex === i;
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? '#FFFFFF' : color}
                  stroke={isSelected ? color : '#FFFFFF'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* X-axis labels */}
                {(data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                  <SvgText
                    x={pt.x}
                    y={chartHeight - 6}
                    fill={isSelected ? theme.text : theme.textSecondary}
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '400'}
                    textAnchor="middle"
                  >
                    {pt.point.label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Invisible tap targets overlay for intuitive iOS touch feedback */}
        <View style={[StyleSheet.absoluteFill, styles.tapOverlay]}>
          {points.map((pt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedIndex(i)}
              style={[
                styles.tapTarget,
                {
                  left: pt.x - 20,
                  top: paddingTop,
                  width: 40,
                  height: innerHeight,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Footer Quick PR Highlight */}
      <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Peak</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {maxPoint} {unit}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Latest</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {latestPoint.value} {unit}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Entries</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {data.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentControlWrapper: {
    width: 140,
  },
  chartWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  tapOverlay: {
    flexDirection: 'row',
  },
  tapTarget: {
    position: 'absolute',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(142, 142, 147, 0.25)',
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  segmentWrapper: {
    width: 160,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
