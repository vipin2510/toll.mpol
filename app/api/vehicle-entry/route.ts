import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plate_number, location, direction, entry_time } = await req.json();

  if (!plate_number || !location || !direction) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
  .schema('Toll') // <-- ADD THIS LINE
    .from('ratikhol_anpr')
    .insert({
      plate_number: plate_number.toUpperCase().trim(),
      location,
      direction,          // 'in_cg' or 'exit_cg'
      entry_time: entry_time ?? new Date().toISOString(),
      added_by: 'website',
      log_time: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}