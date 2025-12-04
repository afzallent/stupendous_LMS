"use client"

import React, { createContext, useContext, useReducer, useEffect } from 'react'

export interface CartItem {
  id: string
  title: string
  instructor: string
  price: number
  originalPrice: number
  thumbnail: string
  duration: string
  lectures: number
  level: string
  rating: number
  addedAt: Date
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

interface CartContextType {
  state: CartState
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  isInCart: (itemId: string) => boolean
  getCartTotal: () => number
  getCartItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Check if item already exists in cart
      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id)
      
      if (existingItemIndex >= 0) {
        // Item already in cart, don't add duplicate
        return state
      }

      const newItems = [...state.items, action.payload]
      const newTotal = newItems.reduce((sum, item) => sum + item.price, 0)
      
      return {
        items: newItems,
        total: newTotal,
        itemCount: newItems.length
      }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload)
      const newTotal = newItems.reduce((sum, item) => sum + item.price, 0)
      
      return {
        items: newItems,
        total: newTotal,
        itemCount: newItems.length
      }
    }
    
    case 'CLEAR_CART': {
      return {
        items: [],
        total: 0,
        itemCount: 0
      }
    }
    
    case 'LOAD_CART': {
      const newTotal = action.payload.reduce((sum, item) => sum + item.price, 0)
      
      return {
        items: action.payload,
        total: newTotal,
        itemCount: action.payload.length
      }
    }
    
    default:
      return state
  }
}

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('coursecompass-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: parsedCart })
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
        localStorage.removeItem('coursecompass-cart')
      }
    }
  }, [])

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('coursecompass-cart', JSON.stringify(state.items))
  }, [state.items])

  const addToCart = (item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeFromCart = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const isInCart = (itemId: string) => {
    return state.items.some(item => item.id === itemId)
  }

  const getCartTotal = () => {
    return state.total
  }

  const getCartItemCount = () => {
    return state.itemCount
  }

  const contextValue: CartContextType = {
    state,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
    getCartTotal,
    getCartItemCount
  }

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}