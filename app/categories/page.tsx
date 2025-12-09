'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name_fr: string
  name_en: string
  description?: string
  is_active?: boolean
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name_fr: '',
    name_en: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }
      const result = await response.json()
      // L'API retourne { data: [...] }
      setCategories(result.data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error)
      toast.error('Erreur lors du chargement des catégories')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingCategory
        ? `/api/products/categories/${editingCategory.id}`
        : '/api/products/categories'

      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingCategory ? 'Catégorie modifiée avec succès' : 'Catégorie créée avec succès')
        fetchCategories()
        setIsDialogOpen(false)
        resetForm()
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleView = (category: Category) => {
    console.log('handleView called with:', category)
    setViewingCategory(category)
    setIsViewDialogOpen(true)
    console.log('Dialog should open now, isViewDialogOpen will be true')
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name_fr: category.name_fr,
      name_en: category.name_en,
      description: category.description || '',
      is_active: category.is_active !== false
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (categoryId: string, permanent = false) => {
    const message = permanent 
      ? 'Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT cette catégorie ? Cette action est irréversible.'
      : 'Êtes-vous sûr de vouloir désactiver cette catégorie ?'
    
    if (!confirm(message)) {
      return
    }

    try {
      const url = permanent 
        ? `/api/products/categories/${categoryId}?permanent=true`
        : `/api/products/categories/${categoryId}`
      
      const response = await fetch(url, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(permanent ? 'Catégorie supprimée définitivement' : 'Catégorie désactivée')
        fetchCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setFormData({ name_fr: '', name_en: '', description: '', is_active: true })
    setEditingCategory(null)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Catégories de Produits</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Catégorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name_fr">Nom (Français)</Label>
                <Input
                  id="name_fr"
                  value={formData.name_fr}
                  onChange={(e) => setFormData({...formData, name_fr: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_en">Nom (Anglais)</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Catégorie active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}>
                  Annuler
                </Button>
                <Button type="submit">{editingCategory ? 'Modifier' : 'Créer'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de visualisation */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la catégorie</DialogTitle>
          </DialogHeader>
          {viewingCategory ? (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-600 font-semibold">Nom (Français)</Label>
                <p className="text-lg font-medium mt-1">{viewingCategory.name_fr}</p>
              </div>
              <div>
                <Label className="text-gray-600 font-semibold">Nom (Anglais)</Label>
                <p className="text-lg font-medium mt-1">{viewingCategory.name_en}</p>
              </div>
              {viewingCategory.description && (
                <div>
                  <Label className="text-gray-600 font-semibold">Description</Label>
                  <p className="text-sm mt-1">{viewingCategory.description}</p>
                </div>
              )}
              <div>
                <Label className="text-gray-600 font-semibold">Statut</Label>
                <p className="text-sm mt-1">
                  {viewingCategory.is_active !== false ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 font-semibold">Date de création</Label>
                <p className="text-sm mt-1">
                  {viewingCategory.created_at
                    ? new Date(viewingCategory.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })
                    : 'Non disponible'}
                </p>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fermer
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false)
                  handleEdit(viewingCategory)
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>Aucune catégorie sélectionnée</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message si aucune catégorie */}
      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune catégorie trouvée</p>
          <p className="text-sm text-gray-400 mt-2">Cliquez sur "Nouvelle Catégorie" pour en créer une</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle>{category.name_fr}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{category.name_en}</p>
              {category.description && (
                <p className="text-sm mb-2 line-clamp-2">{category.description}</p>
              )}
              <div className="mb-4">
                {category.is_active !== false ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Voir button clicked')
                    handleView(category)
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Voir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(category)
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 hover:text-orange-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(category.id, false)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Désactiver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(category.id, true)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer déf.
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}