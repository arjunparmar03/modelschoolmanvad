import { supabase } from './lib/supabase.ts';
(async () => {
  const { data, error } = await supabase.from('cms_data').select('*');
  if (error) console.error('Error:', error);
  else console.log('cms_data rows:', JSON.stringify(data, null, 2));
})();
