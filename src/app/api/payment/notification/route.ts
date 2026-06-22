import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log('Midtrans webhook notification received:', payload)

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      return NextResponse.json({ error: 'Server Key is not configured' }, { status: 500 })
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = payload

    // 1. Verifikasi Validitas Signature Key Midtrans demi keamanan
    const input = order_id + status_code + gross_amount + serverKey
    const hash = crypto.createHash('sha512').update(input).digest('hex')

    if (hash !== signature_key) {
      console.error('Invalid signature key from Midtrans notification!')
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 400 })
    }

    // 2. Hubungkan ke Supabase (menggunakan Service Role Key / Admin Client jika ada,
    // atau jika anon client pastikan bypass RLS untuk update status dari backend webhook)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let paymentStatus = 'unpaid'
    let statusDesc = ''

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        paymentStatus = 'challenge'
        statusDesc = 'Pembayaran terdeteksi ada indikasi fraud, perlu pengecekan manual.'
      } else if (fraud_status === 'accept') {
        paymentStatus = 'paid'
        statusDesc = 'Pembayaran sukses diverifikasi oleh Midtrans (Credit Card).'
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid'
      statusDesc = 'Pembayaran cashless berhasil diselesaikan via Midtrans.'
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      paymentStatus = 'failed'
      statusDesc = `Pembayaran cashless dibatalkan atau kedaluwarsa (Status: ${transaction_status}).`
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending'
      statusDesc = 'Menunggu pembayaran selesai oleh pelanggan.'
    }

    // 3. Update status pembayaran di tabel orders
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', order_id)

    if (updateErr) throw updateErr

    // 4. Masukkan log ke order_status_logs
    await supabase.from('order_status_logs').insert({
      order_id: order_id,
      status: 'pending', // tetapkan status order lama, biarkan ini hanya mencatat status bayar
      description: statusDesc,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Webhook processing error:', err.message)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
