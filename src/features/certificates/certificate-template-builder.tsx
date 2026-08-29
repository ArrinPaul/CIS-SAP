'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Move, 
  Settings2, 
  Eye, 
  Save, 
  Type, 
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  Wand2,
  Download,
  Layout as LayoutIcon,
  Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upsertCertificateTemplate } from '@/app/actions/certificates';
import { cn } from '@/core/utils/utils';
import { generateCertificateHtml, generateHtmlFromLayout } from '@/core/utils/certificate-generator';

interface Field {
  id: string;
  type: 'text' | 'variable' | 'image';
  name: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  value: string;
  variable?: 'attendee_name' | 'event_title' | 'event_date' | 'ticket_number' | 'custom_message';
}

interface TemplateLayout {
  backgroundUrl: string;
  width: number;
  height: number;
  fields: Field[];
}

interface CertificateTemplateBuilderProps {
  eventId: string;
  initialTemplate?: any;
}

export function CertificateTemplateBuilder({ eventId, initialTemplate }: CertificateTemplateBuilderProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTemplate?.title || 'New Certificate Template');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [layout, setLayout] = useState<TemplateLayout>(initialTemplate?.layout || {
    backgroundUrl: '',
    width: 1123, // A4 Landscape px at 96dpi
    height: 794,
    fields: [
      { id: 'f1', type: 'text', name: 'Header', x: 50, y: 15, fontSize: 48, color: '#1a1a1a', fontWeight: 'bold', value: 'Certificate of Attendance' },
      { id: 'f2', type: 'text', name: 'Recipient Prefix', x: 50, y: 35, fontSize: 18, color: '#666666', fontWeight: 'normal', value: 'This is to certify that' },
      { id: 'f3', type: 'variable', name: 'Attendee Name', x: 50, y: 45, fontSize: 36, color: '#0891b2', fontWeight: 'bold', value: '{attendee_name}', variable: 'attendee_name' },
      { id: 'f4', type: 'text', name: 'Event Prefix', x: 50, y: 60, fontSize: 18, color: '#666666', fontWeight: 'normal', value: 'has successfully attended' },
      { id: 'f5', type: 'variable', name: 'Event Title', x: 50, y: 70, fontSize: 24, color: '#1a1a1a', fontWeight: 'bold', value: '{event_title}', variable: 'event_title' },
    ]
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedField = layout.fields.find(f => f.id === selectedFieldId);

  const handleAddField = (type: 'text' | 'variable') => {
    const newField: Field = {
      id: `f-${Date.now()}`,
      type,
      name: type === 'text' ? 'New Text' : 'New Variable',
      x: 50,
      y: 50,
      fontSize: 20,
      color: '#000000',
      fontWeight: 'normal',
      value: type === 'text' ? 'Edit text...' : '{attendee_name}',
      variable: type === 'variable' ? 'attendee_name' : undefined
    };
    setLayout({ ...layout, fields: [...layout.fields, newField] });
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setLayout({
      ...layout,
      fields: layout.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id: string) => {
    setLayout({
      ...layout,
      fields: layout.fields.filter(f => f.id !== id)
    });
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Generate a dynamic HTML version based on the user's custom layout
      const dynamicHtml = generateHtmlFromLayout(layout);

      await upsertCertificateTemplate({
        id: initialTemplate?.id,
        eventId,
        title,
        description,
        layout,
        html: dynamicHtml,
        isDefault: false
      });
      toast({ title: "Success", description: "Certificate template saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Drag logic (simple implementation)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (previewMode) return;
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setIsDragging(true);
    
    const field = layout.fields.find(f => f.id === fieldId);
    if (!field || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedFieldId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    updateField(selectedFieldId, { 
      x: Math.max(0, Math.min(100, xPercent)), 
      y: Math.max(0, Math.min(100, yPercent)) 
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground" onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ChevronRight className="rotate-180" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description || 'Design your event certificates'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? <Settings2 className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Design Mode' : 'Preview'}
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Template
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Fields & Components */}
        <div className="w-72 border-r bg-muted/30 overflow-y-auto p-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">General Settings</h3>
            <div className="space-y-2">
              <Label htmlFor="t-title">Template Name</Label>
              <Input id="t-title" value={title} onChange={e => setTitle(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bg-url">Background Image URL</Label>
              <div className="flex gap-2">
                <Input id="bg-url" value={layout.backgroundUrl} onChange={e => setLayout({...layout, backgroundUrl: e.target.value})} placeholder="https://..." className="bg-background" />
                <Button size="icon" variant="outline"><ImageIcon className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Layout Fields</h3>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddField('text')}><Type size={14} /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddField('variable')}><Wand2 size={14} /></Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {layout.fields.map(field => (
                <div 
                  key={field.id} 
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-sm transition-all cursor-pointer",
                    selectedFieldId === field.id ? "bg-primary/10 border-primary/30" : "bg-background border-border hover:border-cyan-500/20"
                  )}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  {field.type === 'text' ? <Type size={14} className="text-muted-foreground" /> : <Wand2 size={14} className="text-primary" />}
                  <span className="flex-1 truncate">{field.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => handleAddField('text')}>
                <Plus className="w-4 h-4 mr-2" /> Add New Field
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas - Main Editor */}
        <div className="flex-1 bg-muted p-8 overflow-auto flex items-center justify-center" onMouseMove={handleMouseMove}>
          <div 
            ref={canvasRef}
            className="bg-notion-surface shadow-2xl relative overflow-hidden transition-all"
            style={{ 
              width: `${layout.width}px`, 
              height: `${layout.height}px`,
              aspectRatio: '297/210',
              maxWidth: '100%',
              backgroundImage: layout.backgroundUrl ? `url(${layout.backgroundUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            {/* Guide lines if designing */}
            {!previewMode && (
              <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
              </div>
            )}

            {layout.fields.map(field => (
              <div
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                className={cn(
                  "absolute p-1 cursor-move select-none transition-shadow",
                  !previewMode && selectedFieldId === field.id ? "outline outline-2 outline-cyan-500 z-50 shadow-lg" : "z-10",
                  !previewMode && "hover:outline hover:outline-1 hover:outline-cyan-500/50"
                )}
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${field.fontSize}px`,
                  color: field.color,
                  fontWeight: field.fontWeight,
                  fontFamily: 'serif' // Classic certificate font
                }}
              >
                {previewMode && field.variable === 'attendee_name' ? 'John Doe' : 
                 previewMode && field.variable === 'event_title' ? 'Global Developer Summit 2026' : 
                 field.value}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        {selectedField && (
          <div className="w-72 border-l bg-muted/30 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings2 size={14} /> Field Properties
              </h3>
              
              <div className="space-y-2">
                <Label>Label Name</Label>
                <Input value={selectedField.name} onChange={e => updateField(selectedField.id, { name: e.target.value })} className="bg-background" />
              </div>

              {selectedField.type === 'text' ? (
                <div className="space-y-2">
                  <Label>Text Value</Label>
                  <Input value={selectedField.value} onChange={e => updateField(selectedField.id, { value: e.target.value })} className="bg-background" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Variable</Label>
                  <select 
                    className="w-full bg-background border rounded-md p-2 text-sm"
                    value={selectedField.variable}
                    onChange={e => updateField(selectedField.id, { 
                      variable: e.target.value as any,
                      value: `{${e.target.value}}`
                    })}
                  >
                    <option value="attendee_name">Attendee Name</option>
                    <option value="event_title">Event Title</option>
                    <option value="event_date">Event Date</option>
                    <option value="ticket_number">Certificate ID</option>
                    <option value="custom_message">AI Personalized Message</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Typography & Color</h4>
                
                <div className="space-y-2">
                  <Label className="flex justify-between">Font Size <span>{selectedField.fontSize}px</span></Label>
                  <input 
                    type="range" min="8" max="120" 
                    value={selectedField.fontSize} 
                    onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <select 
                      className="w-full bg-background border rounded-md p-2 text-sm"
                      value={selectedField.fontWeight}
                      onChange={e => updateField(selectedField.id, { fontWeight: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="semibold">SemiBold</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded border" style={{ backgroundColor: selectedField.color }} />
                      <Input 
                        value={selectedField.color} 
                        onChange={e => updateField(selectedField.id, { color: e.target.value })} 
                        className="flex-1 h-8 text-xs p-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Position</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">X (%)</Label>
                    <Input type="number" value={Math.round(selectedField.x)} onChange={e => updateField(selectedField.id, { x: parseInt(e.target.value) })} className="bg-background h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Y (%)</Label>
                    <Input type="number" value={Math.round(selectedField.y)} onChange={e => updateField(selectedField.id, { y: parseInt(e.target.value) })} className="bg-background h-8" />
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full text-destructive hover:text-red-600 hover:bg-destructive/10 mt-8" onClick={() => removeField(selectedField.id)}>
                <Trash2 size={14} className="mr-2" /> Delete Field
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" width="24" height="24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
