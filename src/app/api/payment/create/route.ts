import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Ambil user session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Ambil data order & detail customer
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, customer_id(*)')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    
    // Jika MIDTRANS_SERVER_KEY tidak diset, kita gunakan Simulasi/Mock Pembayaran Cashless
    if (!serverKey) {
      console.log('Using simulated payment because MIDTRANS_SERVER_KEY is not defined.')
      return NextResponse.json({
        isMock: true,
        snapToken: `MOCK_SNAP_TOKEN_${order.id.slice(0, 8)}`,
        redirectUrl: `/dashboard?mock_pay=true&order_id=${order.id}`,
      })
    }

    // Integrasi Riil ke Midtrans API (Sandbox/Production)
    const base64Auth = Buffer.from(`${serverKey}:`).toString('base64')
    const midtransUrl = 'https://app.sandbox.midtrans.com/snap/v1/transactions' // sandbox URL

    const payload = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.total_price,
      },
      customer_details: {
        first_name: order.customer_id?.full_name || 'Pelanggan',
        phone: order.customer_id?.phone_number || '',
      },
      credit_card: {
        secure: true,
      },
    }

    const response = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error_messages?.[0] || 'Midtrans API error')
    }

    return NextResponse.json({
      isMock: false,
      snapToken: data.token,
      redirectUrl: data.redirect_url,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
