'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, User, Package } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  code: string
  barcode?: string
  name_fr: string
  name_en: string
  category_id: string
  selling_price_xof: number
  selling_price_eur: number
  selling_price_usd: number
  tax_rate: number
  stock_quantity?: number
  min_stock_level: number
  image_url?: string
  category?: {
    name_fr: string
    name_en: string
  }
}

interface CartItem extends Product {
  quantity: number
  total: number
}

interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'card' | 'mobile'
  currency: string
}

interface Currency {
  code: string
  name: string
  symbol: string
  rate_to_xof: number
}

export default function POSInterface() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState('XOF')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Charger les données initiales
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Charger les produits
      const productsResponse = await fetch('/api/products')
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData.products || [])
      }

      // Charger les catégories
      const categoriesResponse = await fetch('/api/products/categories')
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData.categories || [])
      }

      // Charger les méthodes de paiement
      const paymentMethodsResponse = await fetch('/api/payments/methods')
      if (paymentMethodsResponse.ok) {
        const paymentMethodsData = await paymentMethodsResponse.json()
        setPaymentMethods(paymentMethodsData.methods || [])
      }

      // Charger les devises
      const currenciesResponse = await fetch('/api/currencies')
      if (currenciesResponse.ok) {
        const currenciesData = await currenciesResponse.json()
        setCurrencies(currenciesData.currencies || [])
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return []
    
    return products.filter(product => {
      if (!product) return false
      
      const searchLower = searchQuery?.toLowerCase() || ''
      const matchesSearch = !searchQuery || 
        (product.name_fr && product.name_fr.toLowerCase().includes(searchLower)) ||
        (product.name_en && product.name_en.toLowerCase().includes(searchLower)) ||
        (product.code && product.code.toLowerCase().includes(searchLower)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
      
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // Ajouter au panier
  const addToCart = (product: Product) => {
    if (!product || !product.id) return
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * getProductPrice(item)
              }
            : item
        )
      } else {
        const price = getProductPrice(product)
        return [...prevCart, {
          ...product,
          quantity: 1,
          total: price
        }]
      }
    })
    
    toast.success(`${product.name_fr} ajouté au panier`)
  }

  // Obtenir le prix du produit selon la devise
  const getProductPrice = (product: Product) => {
    switch (selectedCurrency) {
      case 'EUR':
        return product.selling_price_eur || 0
      case 'USD':
        return product.selling_price_usd || 0
      default:
        return product.selling_price_xof || 0
    }
  }

  // Obtenir le symbole de la devise
  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === selectedCurrency)
    return currency?.symbol || selectedCurrency
  }

  // Modifier la quantité dans le panier
  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { 
              ...item, 
              quantity: newQuantity,
              total: newQuantity * getProductPrice(item)
            }
          : item
      )
    )
  }

  // Supprimer du panier
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  // Vider le panier
  const clearCart = () => {
    setCart([])
  }

  // Calculer le total du panier
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.total, 0)
  }, [cart])

  // Traiter le paiement
  const processPayment = async (paymentData: any) => {
    try {
      // Simuler le traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Ici, vous ajouteriez la logique pour enregistrer la vente
      toast.success('Paiement effectué avec succès!')
      clearCart()
      setIsPaymentDialogOpen(false)
      
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      toast.error('Erreur lors du paiement')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Zone des produits */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Point de Vente</h1>
          
          {/* Barre de recherche et filtres */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grille des produits */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name_fr}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  
                  <h3 className="font-medium text-sm mb-2 line-clamp-2">
                    {product.name_fr}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {getProductPrice(product).toLocaleString()} {getCurrencySymbol()}
                    </span>
                    
                    {product.stock_quantity !== undefined && (
                      <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                        {product.stock_quantity}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Panier */}
      <div className="w-96 bg-white border-l shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Panier
            </h2>
            {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCart}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-6">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Votre panier est vide</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name_fr}</h4>
                      <p className="text-xs text-gray-500">
                        {getProductPrice(item).toLocaleString()} {getCurrencySymbol()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Total et paiement */}
        {cart.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-xl font-bold text-primary">
                {cartTotal.toLocaleString()} {getCurrencySymbol()}
              </span>
            </div>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Procéder au paiement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Paiement</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total à payer</p>
                    <p className="text-2xl font-bold text-primary">
                      {cartTotal.toLocaleString()} {getCurrencySymbol()}
                    </p>
                  </div>
                  
                  <Tabs defaultValue="cash">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="cash">
                        <Banknote className="h-4 w-4 mr-2" />
                        Espèces
                      </TabsTrigger>
                      <TabsTrigger value="card">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Carte
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="cash" className="space-y-4">
                      <Input placeholder="Montant reçu" type="number" />
                      <Button 
                        className="w-full" 
                        onClick={() => processPayment({ method: 'cash' })}
                      >
                        Confirmer le paiement
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="card" className="space-y-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Type de carte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="amex">American Express</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="w-full" 
                        onClick={() => processPayment({ method: 'card' })}
                      >
                        Traiter le paiement par carte
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}