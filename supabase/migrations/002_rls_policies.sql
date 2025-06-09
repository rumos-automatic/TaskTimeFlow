-- TaskTimeFlow Row Level Security Policies
-- Created: 2024-06-08
-- Version: 1.0.0

-- ===========================
-- Helper Functions for RLS
-- ===========================

-- Function to check if user is organization member
CREATE OR REPLACE FUNCTION is_organization_member(user_id uuid, org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.user_id = $1 
    AND organization_members.organization_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(user_id uuid, org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.user_id = $1 
    AND organization_members.organization_id = $2
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization from project
CREATE OR REPLACE FUNCTION get_project_organization(project_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM projects 
    WHERE id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- Users Table Policies
-- ===========================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================
-- Organizations Table Policies
-- ===========================

-- Organization members can view their organization
CREATE POLICY "Organization members can view org" ON organizations
  FOR SELECT USING (
    is_organization_member(auth.uid(), id) OR
    owner_id = auth.uid()
  );

-- Organization owners can update their organization
CREATE POLICY "Organization owners can update org" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Users can create organizations
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Organization owners can delete their organization
CREATE POLICY "Organization owners can delete org" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- ===========================
-- Organization Members Table Policies
-- ===========================

-- Organization members can view other members
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (
    is_organization_member(auth.uid(), organization_id)
  );

-- Organization admins can manage members
CREATE POLICY "Org admins can manage members" ON organization_members
  FOR ALL USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- Users can join organizations (if invited)
CREATE POLICY "Users can join organizations" ON organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================
-- Projects Table Policies
-- ===========================

-- Organization members can view projects in their org
CREATE POLICY "Org members can view projects" ON projects
  FOR SELECT USING (
    is_organization_member(auth.uid(), organization_id) OR
    owner_id = auth.uid()
  );

-- Project owners and org admins can update projects
CREATE POLICY "Project owners can update projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    is_organization_admin(auth.uid(), organization_id)
  );

-- Organization members can create projects
CREATE POLICY "Org members can create projects" ON projects
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = owner_id
  );

-- Project owners and org admins can delete projects
CREATE POLICY "Project owners can delete projects" ON projects
  FOR DELETE USING (
    owner_id = auth.uid() OR
    is_organization_admin(auth.uid(), organization_id)
  );

-- ===========================
-- Tasks Table Policies
-- ===========================

-- Organization members can view tasks in their org's projects
CREATE POLICY "Org members can view tasks" ON tasks
  FOR SELECT USING (
    is_organization_member(auth.uid(), get_project_organization(project_id)) OR
    assignee_id = auth.uid() OR
    created_by_id = auth.uid()
  );

-- Task assignees and creators can update tasks
CREATE POLICY "Task assignees can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR
    created_by_id = auth.uid() OR
    is_organization_admin(auth.uid(), get_project_organization(project_id))
  );

-- Organization members can create tasks
CREATE POLICY "Org members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), get_project_organization(project_id)) AND
    auth.uid() = created_by_id
  );

-- Task creators and org admins can delete tasks
CREATE POLICY "Task creators can delete tasks" ON tasks
  FOR DELETE USING (
    created_by_id = auth.uid() OR
    is_organization_admin(auth.uid(), get_project_organization(project_id))
  );

-- ===========================
-- Timeline Slots Table Policies
-- ===========================

-- Users can only access their own timeline slots
CREATE POLICY "Users can view own timeline slots" ON timeline_slots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own timeline slots" ON timeline_slots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own timeline slots" ON timeline_slots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timeline slots" ON timeline_slots
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- Time Blocks Table Policies
-- ===========================

-- Users can only access their own time blocks
CREATE POLICY "Users can view own time blocks" ON time_blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own time blocks" ON time_blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time blocks" ON time_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time blocks" ON time_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- User Settings Table Policies
-- ===========================

-- Users can only access their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================
-- Integrations Table Policies
-- ===========================

-- Users can only access their own integrations
CREATE POLICY "Users can view own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- AI Sessions Table Policies
-- ===========================

-- Users can only access their own AI sessions
CREATE POLICY "Users can view own ai sessions" ON ai_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai sessions" ON ai_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI sessions are read-only after creation (no updates/deletes)

-- ===========================
-- Productivity Analytics Table Policies
-- ===========================

-- Users can only access their own analytics
CREATE POLICY "Users can view own analytics" ON productivity_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON productivity_analytics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics" ON productivity_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================
-- Subscriptions Table Policies
-- ===========================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR
    is_organization_member(auth.uid(), organization_id)
  );

-- Only system/admin can manage subscriptions (INSERT/UPDATE/DELETE)
-- These will be handled by Stripe webhooks and admin functions

-- ===========================
-- Security and Audit Tables
-- ===========================

-- Login attempts - no user access (system only)
-- Account locks - no user access (system only) 

-- Audit logs - users can view their own actions
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- IP allowlists - organization admins only
CREATE POLICY "Org admins can manage ip allowlists" ON ip_allowlists
  FOR ALL USING (
    is_organization_admin(auth.uid(), organization_id)
  );

-- ===========================
-- Service Role Policies
-- ===========================

-- Grant service role bypass for system operations
CREATE POLICY "Service role bypass" ON users
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON organizations
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON organization_members
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON projects
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON tasks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON timeline_slots
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON time_blocks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON user_settings
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON integrations
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON ai_sessions
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON productivity_analytics
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON subscriptions
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON login_attempts
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON account_locks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON audit_logs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass" ON ip_allowlists
  FOR ALL TO service_role USING (true);