-- Allow the budget tracker to store its document alongside dev logs and the planner.
alter table public.documents drop constraint documents_kind_check;
alter table public.documents
  add constraint documents_kind_check check (kind in ('devlog', 'planner', 'budget'));
