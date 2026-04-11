import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterType = searchParams.get('filterType') || 'vehicle_number';
    const filterValue = searchParams.get('filterValue') || '';

    const from = (page - 1) * limit;
    const to = from + (limit - 1);

    let query = supabase
      .from('helmet_violations')
      .select(
        'id, track_id, vehicle_number, challan,detected_at, location, helmet_status, date_folder, status, reason, created_at, complete_image_url, plate_image_url',
        { count: 'exact' }
      );

    if (filterValue) {
      if (filterType === 'status') {
        query = query.eq('status', filterValue.toUpperCase());
      } else if (filterType === 'id' || filterType === 'track_id') {
        query = query.eq(filterType, filterValue);
      } else {
        query = query.ilike(filterType, `%${filterValue}%`);
      }
    }

    const { data, error, count } = await query
      .order('detected_at', { ascending: false })
      .range(from, to);

    if (data && data.length > 0) {
      console.log('DEBUG: First violation record:', JSON.stringify(data[0], null, 2));
    }

    if (error) {
      console.log(error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch global stats separately for the dashboard
    const { count: pendingCount } = await supabase
      .from('helmet_violations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { count: acceptedCount } = await supabase
      .from('helmet_violations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACCEPTED');

    const { count: declinedCount } = await supabase
      .from('helmet_violations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'DECLINED');

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      limit,
      stats: {
        pending: pendingCount || 0,
        accepted: acceptedCount || 0,
        declined: declinedCount || 0
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
