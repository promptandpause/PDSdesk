-- Update service catalog icons from emojis to SVG icon keys

-- Update categories
update public.service_catalog_categories set icon = 'monitor' where id = '10000000-0000-0000-0000-000000000001';
update public.service_catalog_categories set icon = 'users' where id = '10000000-0000-0000-0000-000000000002';
update public.service_catalog_categories set icon = 'bug' where id = '10000000-0000-0000-0000-000000000003';
update public.service_catalog_categories set icon = 'clipboard-list' where id = '10000000-0000-0000-0000-000000000004';
update public.service_catalog_categories set icon = 'folder-kanban' where id = '10000000-0000-0000-0000-000000000005';
update public.service_catalog_categories set icon = 'building' where id = '10000000-0000-0000-0000-000000000006';

-- Update IT Services items
update public.service_catalog_items set icon = 'user-plus' where id = '20000000-0000-0000-0000-000000000001';
update public.service_catalog_items set icon = 'key' where id = '20000000-0000-0000-0000-000000000002';
update public.service_catalog_items set icon = 'download' where id = '20000000-0000-0000-0000-000000000003';
update public.service_catalog_items set icon = 'laptop' where id = '20000000-0000-0000-0000-000000000004';
update public.service_catalog_items set icon = 'wifi' where id = '20000000-0000-0000-0000-000000000005';
update public.service_catalog_items set icon = 'mail' where id = '20000000-0000-0000-0000-000000000006';
update public.service_catalog_items set icon = 'hard-drive' where id = '20000000-0000-0000-0000-000000000007';
update public.service_catalog_items set icon = 'printer' where id = '20000000-0000-0000-0000-000000000008';

-- Update HR Services items
update public.service_catalog_items set icon = 'calendar' where id = '20000000-0000-0000-0000-000000000010';
update public.service_catalog_items set icon = 'dollar-sign' where id = '20000000-0000-0000-0000-000000000011';
update public.service_catalog_items set icon = 'heart' where id = '20000000-0000-0000-0000-000000000012';
update public.service_catalog_items set icon = 'user-plus' where id = '20000000-0000-0000-0000-000000000013';
update public.service_catalog_items set icon = 'user-minus' where id = '20000000-0000-0000-0000-000000000014';
update public.service_catalog_items set icon = 'graduation-cap' where id = '20000000-0000-0000-0000-000000000015';

-- Update Bug Reports items
update public.service_catalog_items set icon = 'bug' where id = '20000000-0000-0000-0000-000000000020';
update public.service_catalog_items set icon = 'globe' where id = '20000000-0000-0000-0000-000000000021';

-- Update Procedures & Standards items
update public.service_catalog_items set icon = 'file-text' where id = '20000000-0000-0000-0000-000000000030';
update public.service_catalog_items set icon = 'lightbulb' where id = '20000000-0000-0000-0000-000000000031';
update public.service_catalog_items set icon = 'help-circle' where id = '20000000-0000-0000-0000-000000000032';

-- Update Projects items
update public.service_catalog_items set icon = 'rocket' where id = '20000000-0000-0000-0000-000000000040';
update public.service_catalog_items set icon = 'users-round' where id = '20000000-0000-0000-0000-000000000041';
update public.service_catalog_items set icon = 'bar-chart' where id = '20000000-0000-0000-0000-000000000042';

-- Update Departments items
update public.service_catalog_items set icon = 'building' where id = '20000000-0000-0000-0000-000000000050';
