"use client"

import { XLVILoader } from "@/components/ui/xlvi-loader"

export default function DemoLoaderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">XLVILoader Demo</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Default loader */}
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Default</h3>
            <XLVILoader />
            <p className="text-sm text-gray-600 mt-2">Default colors & size</p>
          </div>

          {/* Large loader */}
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Large</h3>
            <XLVILoader size="128px" />
            <p className="text-sm text-gray-600 mt-2">128px size</p>
          </div>

          {/* Custom colors */}
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Custom Colors</h3>
            <XLVILoader boxColors={['#EF4444', '#F59E0B', '#10B981']} />
            <p className="text-sm text-gray-600 mt-2">Red, Orange, Green</p>
          </div>

          {/* Purple theme */}
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Purple Theme</h3>
            <XLVILoader boxColors={['#8B5CF6', '#A78BFA', '#C4B5FD']} />
            <p className="text-sm text-gray-600 mt-2">Purple gradient</p>
          </div>

          {/* Small loader */}
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Small</h3>
            <XLVILoader size="48px" boxColors={['#06B6D4', '#0891B2', '#0E7490']} />
            <p className="text-sm text-gray-600 mt-2">48px size, cyan theme</p>
          </div>

          {/* Dashboard loader (same as used in learn page) */}
          <div className="text-center p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Dashboard Style</h3>
            <XLVILoader 
              size="96px" 
              boxColors={['#3b82f6', '#8b5cf6', '#06b6d4']} 
            />
            <p className="text-sm text-gray-600 mt-2">Used in student dashboard</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-6">Loading States Example</h2>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex flex-col items-center">
              <XLVILoader 
                size="96px" 
                boxColors={['#3b82f6', '#8b5cf6', '#06b6d4']} 
                className="mb-6" 
              />
              <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
              <p className="text-gray-400 text-sm mt-2">Preparing your learning experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}