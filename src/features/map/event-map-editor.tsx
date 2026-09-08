'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStorage } from '@/lib/storage';
import { saveEventMap, type MapEdge, type MapNodeInput } from '@/app/actions/event-maps';
import { NODE_CATEGORY_CONFIG } from './node-icon-map';
import MapNodePalette, { type EditorMode } from './map-node-palette';
import { Upload, Save, Trash2 } from 'lucide-react';

interface EventMapEditorProps {
  eventId: string;
  existingMap?: {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    edges: MapEdge[];
    nodes: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      x: number;
      y: number;
      icon: string;
      color: string;
    }>;
  } | null;
}

export function EventMapEditor({ eventId, existingMap }: EventMapEditorProps) {
  const { uploadFile } = useStorage();
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState(existingMap?.imageUrl || '');
  const [imageWidth, setImageWidth] = useState(existingMap?.imageWidth || 0);
  const [imageHeight, setImageHeight] = useState(existingMap?.imageHeight || 0);
  const [nodes, setNodes] = useState<MapNodeInput[]>(
    existingMap?.nodes.map(n => ({
      id: n.id,
      name: n.name,
      description: n.description || undefined,
      category: n.category,
      x: typeof n.x === 'string' ? parseFloat(n.x) : n.x,
      y: typeof n.y === 'string' ? parseFloat(n.y) : n.y,
      icon: n.icon,
      color: n.color,
    })) || []
  );
  const [edges, setEdges] = useState<MapEdge[]>(existingMap?.edges || []);

  const [mode, setMode] = useState<EditorMode>('place');
  const [selectedCategory, setSelectedCategory] = useState('location');
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [pendingNodePos, setPendingNodePos] = useState<{ x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<MapNodeInput | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      const img = new Image();
      img.onload = () => {
        setImageWidth(img.naturalWidth);
        setImageHeight(img.naturalHeight);
        setImageUrl(url);
        setNodes([]);
        setEdges([]);
      };
      img.src = url;
    } catch (err) {
      console.error('Map image upload failed:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'place') return;
    const svg = svgRef.current;
    if (!svg || !imageWidth || !imageHeight) return;

    const rect = svg.getBoundingClientRect();
    const scaleX = imageWidth / rect.width;
    const scaleY = imageHeight / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const percentX = (svgX / imageWidth) * 100;
    const percentY = (svgY / imageHeight) * 100;

    setPendingNodePos({ x: percentX, y: percentY });
    setEditingNode(null);
    setNodeName('');
    setNodeDescription('');
    setShowNodeDialog(true);
  }, [mode, imageWidth, imageHeight]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (mode === 'connect') {
      if (connectFrom === null) {
        setConnectFrom(nodeId);
      } else if (connectFrom !== nodeId) {
        const exists = edges.some(
          e => (e.from === connectFrom && e.to === nodeId) ||
               (e.from === nodeId && e.to === connectFrom)
        );
        if (!exists) {
          setEdges(prev => [...prev, { from: connectFrom, to: nodeId }]);
        }
        setConnectFrom(null);
      }
    } else if (mode === 'select') {
      setSelectedNodeId(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setEditingNode(node);
        setNodeName(node.name);
        setNodeDescription(node.description || '');
        setPendingNodePos(null);
        setShowNodeDialog(true);
      }
    } else {
      setSelectedNodeId(nodeId);
    }
  }, [mode, connectFrom, edges, nodes]);

  const handleSaveNode = () => {
    if (!nodeName.trim()) return;

    if (editingNode) {
      setNodes(prev => prev.map(n =>
        n.id === editingNode.id
          ? { ...n, name: nodeName, description: nodeDescription || undefined }
          : n
      ));
    } else if (pendingNodePos) {
      const newNode: MapNodeInput = {
        id: crypto.randomUUID(),
        name: nodeName,
        description: nodeDescription || undefined,
        category: selectedCategory,
        x: pendingNodePos.x,
        y: pendingNodePos.y,
        icon: NODE_CATEGORY_CONFIG[selectedCategory]?.symbol || 'L',
        color: NODE_CATEGORY_CONFIG[selectedCategory]?.color || '#6366f1',
      };
      setNodes(prev => [...prev, newNode]);
    }

    setShowNodeDialog(false);
    setPendingNodePos(null);
    setEditingNode(null);
    setNodeName('');
    setNodeDescription('');
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!imageUrl || !imageWidth || !imageHeight) return;
    setSaving(true);
    await saveEventMap(eventId, {
      imageUrl,
      imageWidth,
      imageHeight,
      nodes,
      edges,
    });
    setSaving(false);
  };

  return (
    <div className="flex h-[700px] border rounded-lg overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Sidebar */}
      <div className="w-72 border-r p-4 overflow-y-auto space-y-4">
        <MapNodePalette
          mode={mode}
          onModeChange={setMode}
          connectFrom={connectFrom}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Node list */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Nodes ({nodes.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {nodes.map(node => (
              <div
                key={node.id}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer ${
                  selectedNodeId === node.id ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
                onClick={() => node.id && setSelectedNodeId(node.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                  <span className="truncate">{node.name}</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); if (node.id) handleDeleteNode(node.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Edge list */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Connections ({edges.length})</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              return (
                <div key={i} className="flex items-center justify-between px-2 py-1 rounded text-xs bg-muted/50">
                  <span>{fromNode?.name} &rarr; {toNode?.name}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setEdges(prev => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
        {imageUrl ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            className="w-full h-full"
            style={{ cursor: mode === 'place' ? 'crosshair' : 'default' }}
            onClick={handleSvgClick}
          >
            <image href={imageUrl} width={imageWidth} height={imageHeight} />

            {/* Edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={i}
                  x1={(fromNode.x / 100) * imageWidth}
                  y1={(fromNode.y / 100) * imageHeight}
                  x2={(toNode.x / 100) * imageWidth}
                  y2={(toNode.y / 100) * imageHeight}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray={connectFrom ? "8 4" : "none"}
                  opacity="0.7"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const px = (node.x / 100) * imageWidth;
              const py = (node.y / 100) * imageHeight;
              const isHighlighted = connectFrom === node.id || selectedNodeId === node.id;
              return (
                <g
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); if (node.id) handleNodeClick(node.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={px}
                    cy={py}
                    r={isHighlighted ? 16 : 12}
                    fill={node.color || '#6366f1'}
                    stroke="#fff"
                    strokeWidth="3"
                  />
                  <text
                    x={px}
                    y={py + 4}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-white pointer-events-none"
                  >
                    {node.icon || 'L'}
                  </text>
                  <text
                    x={px}
                    y={py + 30}
                    textAnchor="middle"
                    className="text-xs font-medium fill-foreground pointer-events-none"
                  >
                    {node.name.length > 12 ? node.name.substring(0, 10) + '...' : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Upload Map Image</p>
                <p className="text-sm text-muted-foreground">
                  Floor plan, venue layout, or campus map
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Save button */}
        {imageUrl && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button onClick={handleSave} disabled={saving || !imageUrl}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Map'}
            </Button>
          </div>
        )}
      </div>

      {/* Node Dialog */}
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNode ? 'Edit Node' : 'Add Node'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="e.g. Main Stage, Booth A1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={nodeDescription}
                onChange={(e) => setNodeDescription(e.target.value)}
                placeholder="Brief description of this location"
              />
            </div>
            {!editingNode && (
              <div>
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(NODE_CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selectedCategory === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted-foreground/30 hover:border-primary'
                      }`}
                      onClick={() => setSelectedCategory(key)}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNodeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNode} disabled={!nodeName.trim()}>
              {editingNode ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
