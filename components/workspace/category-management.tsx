'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Plus, Edit2, Trash2, Check, X, Palette, Smile } from 'lucide-react'
import { CustomCategory } from '@/lib/types'
import { useCategoryStoreWithAuth, CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/store/use-category-store'
import { useAuth } from '@/lib/auth/auth-context'

interface AddCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AddCategoryModal({ open, onOpenChange }: AddCategoryModalProps) {
  const { user } = useAuth()
  const { addCustomCategory, getNextAvailableColor, getNextAvailableIcon } = useCategoryStoreWithAuth()
  const [formData, setFormData] = useState({
    name: '',
    color: getNextAvailableColor(),
    icon: getNextAvailableIcon(),
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !user) return

    setIsSubmitting(true)
    try {
      await addCustomCategory({
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        description: formData.description.trim() || undefined,
        isBuiltIn: false,
        userId: user.id
      })
      
      // Reset form
      setFormData({
        name: '',
        color: getNextAvailableColor(),
        icon: getNextAvailableIcon(),
        description: ''
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>新しいカテゴリを追加</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category-name">カテゴリ名</Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例: プロジェクトA"
              required
              autoFocus
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color 
                      ? 'border-foreground scale-110' 
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {formData.color === color && (
                    <Check className="w-4 h-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>アイコン</Label>
            <div className="grid grid-cols-10 gap-2 max-h-24 overflow-y-auto">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-8 h-8 rounded border transition-all text-lg ${
                    formData.icon === icon 
                      ? 'border-primary bg-primary/10 scale-110' 
                      : 'border-border hover:border-primary/50 hover:scale-105'
                  }`}
                  title={`アイコン: ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="category-description">説明（任意）</Label>
            <Input
              id="category-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="このカテゴリの説明"
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>プレビュー</Label>
            <div className="flex items-center space-x-2 p-2 border rounded">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-lg">{formData.icon}</span>
              <span className="font-medium">{formData.name || 'カテゴリ名'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? '追加中...' : '追加'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EditCategoryModalProps {
  category: CustomCategory
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditCategoryModal({ category, open, onOpenChange }: EditCategoryModalProps) {
  const { updateCustomCategory } = useCategoryStoreWithAuth()
  const [formData, setFormData] = useState({
    name: category.name,
    color: category.color,
    icon: category.icon || '📝',
    description: category.description || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      await updateCustomCategory(category.id, {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        description: formData.description.trim() || undefined
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit2 className="w-5 h-5" />
            <span>カテゴリを編集</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Same form fields as AddCategoryModal */}
          <div className="space-y-2">
            <Label htmlFor="edit-category-name">カテゴリ名</Label>
            <Input
              id="edit-category-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>カラー</Label>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color 
                      ? 'border-foreground scale-110' 
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && (
                    <Check className="w-4 h-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>アイコン</Label>
            <div className="grid grid-cols-10 gap-2 max-h-24 overflow-y-auto">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-8 h-8 rounded border transition-all text-lg ${
                    formData.icon === icon 
                      ? 'border-primary bg-primary/10 scale-110' 
                      : 'border-border hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category-description">説明（任意）</Label>
            <Input
              id="edit-category-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="このカテゴリの説明"
            />
          </div>

          <div className="space-y-2">
            <Label>プレビュー</Label>
            <div className="flex items-center space-x-2 p-2 border rounded">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-lg">{formData.icon}</span>
              <span className="font-medium">{formData.name}</span>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? '更新中...' : '更新'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteCategoryModalProps {
  category: CustomCategory
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteCategoryModal({ category, open, onOpenChange }: DeleteCategoryModalProps) {
  const { deleteCustomCategory } = useCategoryStoreWithAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCustomCategory(category.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete category:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            <span>カテゴリを削除</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-3 bg-muted rounded">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-lg">{category.icon}</span>
            <span className="font-medium">{category.name}</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            このカテゴリを削除しますか？この操作は元に戻せません。
            <br />
            このカテゴリに属するタスクは「個人」カテゴリに移動されます。
          </p>

          <div className="flex space-x-2 pt-4">
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? '削除中...' : '削除'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CategoryManagementProps {
  children: React.ReactNode
}

export function CategoryManagement({ children }: CategoryManagementProps) {
  const { customCategories } = useCategoryStoreWithAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CustomCategory | null>(null)

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>カテゴリ管理</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Category Button */}
            <Button 
              onClick={() => setShowAddModal(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              新しいカテゴリを追加
            </Button>

            <Separator />

            {/* Custom Categories List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">カスタムカテゴリ</Label>
              
              {customCategories.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  <Smile className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">カスタムカテゴリがありません</p>
                  <p className="text-xs">上のボタンから追加してください</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {customCategories.map((category) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-lg">{category.icon}</span>
                              <div>
                                <p className="font-medium text-sm">{category.name}</p>
                                {category.description && (
                                  <p className="text-xs text-muted-foreground">{category.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingCategory(category)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddCategoryModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
      
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
        />
      )}
      
      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
        />
      )}
    </>
  )
}