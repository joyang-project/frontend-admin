import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Save, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

import { CaseForm } from './cases/CaseForm'
import { CaseItemCard } from './cases/CaseItemCard'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface CaseItem {
  id: string;
  title: string;
  service_type: string;
  image_url: string;
  location_tag: string;
  description: string;
}

export default function ConstructionCaseManager() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<CaseItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isOrderChanged, setIsOrderChanged] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({ 
    title: '', 
    service_type: '가정용', 
    location_tag: '', 
    description: '' 
  })

  const fetchCases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/construction-cases`)
      const data = await response.json()
      setItems(data)
      setIsOrderChanged(false)
    } catch (error) { toast.error("데이터 로드 실패") }
  }

  useEffect(() => { fetchCases() }, [])

  const handleSubmit = async () => {
    if (!file || !formData.title) {
      toast.warning("정보 부족", { description: "이미지와 제목은 필수입니다." })
      return
    }
    setIsLoading(true)
    
    const data = new FormData()
    data.append('image', file)
    data.append('title', formData.title)
    data.append('service_type', formData.service_type)
    data.append('location_tag', formData.location_tag)
    data.append('description', formData.description || "")

    try {
      const response = await fetch(`${API_BASE_URL}/construction-cases/upload`, { 
        method: 'POST', 
        body: data 
      })
      
      if (response.ok) {
        toast.success("등록 완료")
        setFile(null); setPreviewUrl(null)
        setFormData({ title: '', service_type: '가정용', location_tag: '', description: '' })
        setIsDialogOpen(false); fetchCases()
      } else {
        const err = await response.json();
        toast.error("서버 에러", { description: err.message });
      }
    } catch (error) { 
      toast.error("네트워크 에러") 
    } finally { 
      setIsLoading(false) 
    }
  }

  const onDragEnd = (result: any) => {
    if (!result.destination || result.destination.index === result.source.index) return
    const newItems = Array.from(items)
    const [reorderedItem] = newItems.splice(result.source.index, 1)
    newItems.splice(result.destination.index, 0, reorderedItem)
    setItems(newItems)
    setIsOrderChanged(true)
  }

  const handleSaveOrder = async () => {
    setIsSavingOrder(true)
    try {
      await fetch(`${API_BASE_URL}/construction-cases/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: items.map(item => item.id) }),
      })
      toast.success("순서 저장 완료"); setIsOrderChanged(false)
    } catch (error) { toast.error("순서 저장 실패") } finally { setIsSavingOrder(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    try {
      const response = await fetch(`${API_BASE_URL}/construction-cases/${deleteTargetId}`, { method: 'DELETE' })
      if (response.ok) { toast.success("삭제되었습니다."); fetchCases(); }
    } catch (error) { toast.error("삭제 실패") } finally { setDeleteTargetId(null) }
  }

  return (
    <div className="relative w-full select-none">
      <div className="flex flex-col lg:grid lg:grid-cols-7 gap-6 items-start">
        <Card className="hidden lg:block lg:col-span-3 border-border bg-card shadow-sm sticky top-6">
          <CardHeader><CardTitle>새 사례 등록</CardTitle><CardDescription>시공 정보를 입력하세요.</CardDescription></CardHeader>
          <CardContent>
            <CaseForm formData={formData} setFormData={setFormData} previewUrl={previewUrl} setFile={setFile} setPreviewUrl={setPreviewUrl} handleSubmit={handleSubmit} isLoading={isLoading} fileInputRef={fileInputRef} />
          </CardContent>
        </Card>

        <Card className="w-full lg:col-span-4 border-border bg-card shadow-sm min-h-[500px] flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>노출 순서 설정</CardTitle>
            <div className="flex gap-2">
              {isOrderChanged && (
                <Button onClick={handleSaveOrder} disabled={isSavingOrder} size="sm" className="animate-in fade-in zoom-in">
                  {isSavingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  순서 저장
                </Button>
              )}
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> 사례 등록
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="admin-cases">
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef} 
                    className={`space-y-3 min-h-[300px] transition-colors duration-200 rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-muted/30 p-1' : ''
                    }`}
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(p, s) => <CaseItemCard item={item} provided={p} snapshot={s} onDelete={setDeleteTargetId} />}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {items.length === 0 && <div className="py-24 text-center border-2 border-dashed rounded-lg bg-muted/30 text-muted-foreground text-sm">등록된 사례가 없습니다.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button onClick={() => setIsDialogOpen(true)} size="icon" className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform"><Plus className="h-8 w-8" /></Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95%] max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>새 시공 사례 등록</DialogTitle></DialogHeader>
          <CaseForm formData={formData} setFormData={setFormData} previewUrl={previewUrl} setFile={setFile} setPreviewUrl={setPreviewUrl} handleSubmit={handleSubmit} isLoading={isLoading} fileInputRef={fileInputRef} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><div className="flex items-center gap-2 text-destructive mb-2"><AlertCircle className="h-5 w-5" /><AlertDialogTitle>시공 사례 삭제</AlertDialogTitle></div><AlertDialogDescription>정말로 이 시공 사례를 삭제하시겠습니까? 삭제된 데이터와 이미지는 복구할 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제하기</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}