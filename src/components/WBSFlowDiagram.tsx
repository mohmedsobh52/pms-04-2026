import { useState, useMemo, useRef, useEffect } from "react";
import { GitBranch, ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface WBSFlowDiagramProps {
  wbsData: WBSItem[];
}

interface FlowNode {
  id: string;
  code: string;
  title: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: string[];
  parentId?: string;
}

const NODE_COLORS = [
  { bg: "bg-primary/20", border: "border-primary", text: "text-primary" },
  { bg: "bg-accent/20", border: "border-accent", text: "text-accent-foreground" },
  { bg: "bg-success/20", border: "border-success", text: "text-success" },
  { bg: "bg-warning/20", border: "border-warning", text: "text-warning" },
  { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-700" },
];

export function WBSFlowDiagram({ wbsData }: WBSFlowDiagramProps) {
  const { isArabic } = useLanguage();
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build flow nodes with positions
  const flowNodes = useMemo(() => {
    const nodes: FlowNode[] = [];
    const nodeWidth = 180;
    const nodeHeight = 60;
    const horizontalGap = 40;
    const verticalGap = 80;

    // Group by level
    const levelGroups: Record<number, WBSItem[]> = {};
    wbsData.forEach(item => {
      if (!levelGroups[item.level]) levelGroups[item.level] = [];
      levelGroups[item.level].push(item);
    });

    const levels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);

    // Calculate positions
    levels.forEach((level, levelIndex) => {
      const items = levelGroups[level];
      const totalWidth = items.length * nodeWidth + (items.length - 1) * horizontalGap;
      const startX = (800 - totalWidth) / 2;

      items.forEach((item, itemIndex) => {
        const children = wbsData
          .filter(child => child.parent_code === item.code)
          .map(child => child.code);

        nodes.push({
          id: item.code,
          code: item.code,
          title: item.title,
          level: item.level,
          x: startX + itemIndex * (nodeWidth + horizontalGap),
          y: levelIndex * (nodeHeight + verticalGap) + 20,
          width: nodeWidth,
          height: nodeHeight,
          children,
          parentId: item.parent_code,
        });
      });
    });

    return nodes;
  }, [wbsData]);

  // Get connections between nodes
  const connections = useMemo(() => {
    const lines: Array<{ from: FlowNode; to: FlowNode }> = [];
    
    flowNodes.forEach(node => {
      if (node.parentId) {
        const parentNode = flowNodes.find(n => n.id === node.parentId);
        if (parentNode) {
          lines.push({ from: parentNode, to: node });
        }
      }
    });

    return lines;
  }, [flowNodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const exportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Title
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("WBS Flow Diagram", margin, 16);

    yPos = 35;
    pdf.setTextColor(30, 41, 59);

    // Draw nodes as a simplified diagram
    flowNodes.forEach((node, index) => {
      if (yPos > 180) {
        pdf.addPage();
        yPos = 20;
      }

      const indent = margin + (node.level - 1) * 15;
      const prefix = node.level === 1 ? "●" : node.level === 2 ? "○" : "▸";
      
      pdf.setFontSize(node.level === 1 ? 12 : node.level === 2 ? 10 : 9);
      pdf.setFont("helvetica", node.level === 1 ? "bold" : "normal");
      
      pdf.text(`${prefix} ${node.code} - ${node.title}`, indent, yPos);
      yPos += 8;

      // Draw connection line indicator
      if (node.children.length > 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`  → ${node.children.length} children`, indent + 10, yPos);
        pdf.setTextColor(30, 41, 59);
        yPos += 5;
      }
    });

    pdf.save('wbs-flow-diagram.pdf');
  };

  const resetView = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  if (wbsData.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          {isArabic ? "لا توجد بيانات WBS لعرضها" : "No WBS data to display"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          {isArabic ? "مخطط التدفق - WBS" : "WBS Flow Diagram"}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-lg px-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(150, zoom + 10))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="relative h-[500px] overflow-hidden bg-muted/20 border-t border-border cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ 
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Draw connections */}
            {connections.map((conn, idx) => {
              const fromX = conn.from.x + conn.from.width / 2;
              const fromY = conn.from.y + conn.from.height;
              const toX = conn.to.x + conn.to.width / 2;
              const toY = conn.to.y;
              const midY = (fromY + toY) / 2;

              return (
                <g key={idx}>
                  {/* Connection path */}
                  <path
                    d={`M ${fromX} ${fromY} 
                        C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="opacity-60"
                  />
                  {/* Arrow head */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r="4"
                    fill="hsl(var(--primary))"
                    className="opacity-80"
                  />
                </g>
              );
            })}
          </svg>

          {/* Draw nodes */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            {flowNodes.map((node, idx) => {
              const colorSet = NODE_COLORS[node.level - 1] || NODE_COLORS[NODE_COLORS.length - 1];
              
              return (
                <div
                  key={node.id}
                  className={cn(
                    "absolute rounded-lg border-2 p-2 shadow-md pointer-events-auto cursor-pointer transition-all hover:shadow-lg hover:scale-105",
                    colorSet.bg,
                    colorSet.border
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                  }}
                >
                  <div className="flex flex-col h-full justify-center">
                    <span className={cn("text-xs font-mono font-bold", colorSet.text)}>
                      {node.code}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate" title={node.title}>
                      {node.title}
                    </span>
                    {node.children.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {node.children.length} {isArabic ? "فرعي" : "children"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border flex items-center gap-4 flex-wrap text-sm">
          {NODE_COLORS.slice(0, 3).map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border-2", color.bg, color.border)} />
              <span className="text-muted-foreground">Level {idx + 1}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <svg className="w-8 h-2">
              <line x1="0" y1="6" x2="32" y2="6" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 2" />
            </svg>
            <span className="text-muted-foreground">{isArabic ? "اعتماد" : "Dependency"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
