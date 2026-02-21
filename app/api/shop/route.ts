import { NextResponse } from 'next/server'
import { SHOP_ITEMS } from '@/lib/shop/catalog'

export async function GET() {
  return NextResponse.json(SHOP_ITEMS)
}
