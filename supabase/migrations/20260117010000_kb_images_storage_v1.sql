-- Create storage bucket for KB images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kb-images',
  'kb-images',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload images
drop policy if exists kb_images_insert on storage.objects;
create policy kb_images_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kb-images'
  and (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
);

-- Allow public read access
drop policy if exists kb_images_select on storage.objects;
create policy kb_images_select
on storage.objects
for select
to public
using (bucket_id = 'kb-images');

-- Allow owners to delete their images
drop policy if exists kb_images_delete on storage.objects;
create policy kb_images_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'kb-images'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_global_admin())
);
