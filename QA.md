# QA Runbook - Multi-Party Gift Registry

This document provides step-by-step manual verification actions and expected outcomes for the Gift Registry MVP.

## Prerequisites

- Application deployed and running
- Supabase project configured with magic link authentication
- At least 2 email addresses for testing (or use Supabase test users)
- Database migrations applied

## Test Scenarios

### 1. User Registration & Authentication

#### 1.1 Sign In Flow
**Steps:**
1. Navigate to `/auth/signin`
2. Enter a valid email address
3. Click "Send Magic Link"

**Expected:**
- [ ] Success message appears: "Check your email!"
- [ ] Magic link email is received
- [ ] Clicking the link redirects to `/dashboard`
- [ ] User is authenticated and sees their email in the header

#### 1.2 Sign Out
**Steps:**
1. While signed in, click "Sign Out" on the dashboard

**Expected:**
- [ ] User is redirected to the home page
- [ ] User is no longer authenticated

---

### 2. Registry Management

#### 2.1 Create Registry
**Steps:**
1. Sign in and navigate to `/dashboard`
2. Click "Create Registry"
3. Fill in:
   - Title: "Test Holiday Registry"
   - Occasion Date: December 25, 2025
   - Enable "Allow collaborators to invite others"
4. Click "Create"

**Expected:**
- [ ] Registry is created successfully
- [ ] User is redirected to the registry view
- [ ] Owner's sub-list is visible
- [ ] "Invite People" button is visible

#### 2.2 View Registry
**Steps:**
1. From dashboard, click on a registry

**Expected:**
- [ ] Registry title and details are displayed
- [ ] Owner's sub-list shows "(You)" indicator
- [ ] "Add Item" button is visible on owner's sub-list

---

### 3. Invite Flow

#### 3.1 Send Invite
**Steps:**
1. In a registry, click "Invite People"
2. Enter collaborator's email and name
3. Click "Send Invite"

**Expected:**
- [ ] Success message appears
- [ ] New collaborator appears in the registry with "Invite pending" status
- [ ] Collaborator's sub-list is created (empty)
- [ ] Magic link email is sent to the invitee

#### 3.2 Accept Invite
**Steps:**
1. As the invited user, click the magic link in the email
2. Observe the accept-invite page

**Expected:**
- [ ] Registry information is shown on the accept page
- [ ] User is signed in via magic link
- [ ] Invite is accepted automatically
- [ ] User can view the registry
- [ ] User's sub-list is now associated with their account
- [ ] Status changes from "Invite pending" to accepted

---

### 4. Item Management

#### 4.1 Add Item (Own Sub-list)
**Steps:**
1. On your own sub-list, click "Add Item"
2. Enter item name: "Wireless Headphones"
3. Enter URL: `https://example.com/headphones`
4. Click "Add"

**Expected:**
- [ ] Item appears on your sub-list
- [ ] URL is parsed and title may be extracted
- [ ] Item shows as link if URL provided

#### 4.2 Delete Item (Owner)
**Steps:**
1. On your own sub-list, click "Delete" on an item

**Expected:**
- [ ] Item shows "Deleted by owner" badge
- [ ] Item is still visible to other collaborators
- [ ] Owner can no longer edit the item

---

### 5. Claim Flow

#### 5.1 Claim Item
**Steps:**
1. As a collaborator (not the sub-list owner), view another user's sub-list
2. Click "Claim" on an unclaimed item

**Expected:**
- [ ] "Claim" button changes to "Release" and "Mark Bought"
- [ ] Item shows "Claimed by [your name]" badge
- [ ] The sub-list owner does NOT see the claim information

#### 5.2 Owner Cannot See Claims
**Steps:**
1. As the sub-list owner, view your own sub-list

**Expected:**
- [ ] Items show normally without any claim/bought badges
- [ ] No indication of who claimed or bought items

#### 5.3 Release Claim
**Steps:**
1. As the claimer, click "Release" on a claimed item

**Expected:**
- [ ] Item becomes unclaimed
- [ ] "Claim" button reappears
- [ ] Other collaborators can now claim the item

#### 5.4 Mark as Bought
**Steps:**
1. Claim an item
2. Click "Mark Bought"

**Expected:**
- [ ] Item shows "Bought by [your name]" badge to other collaborators
- [ ] Owner still cannot see bought status
- [ ] Item is no longer claimable

---

### 6. Collaborator Removal

#### 6.1 Remove Collaborator (as Owner)
**Steps:**
1. As registry owner, click "Remove" next to a collaborator's sub-list
2. Confirm the action

**Expected:**
- [ ] Collaborator is removed from the registry
- [ ] Their sub-list and all items are deleted
- [ ] Any claims they held on other items are cleared
- [ ] Removed user can no longer access the registry

---

### 7. Visibility Rules Verification

#### 7.1 Owner View
**Steps:**
1. Have someone claim/buy items on your sub-list
2. View your own sub-list

**Expected:**
- [ ] Items visible without claim information
- [ ] No indication of who claimed or bought
- [ ] Can still delete items

#### 7.2 Collaborator View
**Steps:**
1. View another collaborator's sub-list

**Expected:**
- [ ] Can see all items
- [ ] Can see claim status and claimer name
- [ ] Can see bought status
- [ ] Deleted items show "Deleted by owner" badge

---

### 8. Concurrent Operations

#### 8.1 Concurrent Claim Attempt
**Steps:**
1. Set up two browser sessions with different users
2. Both users attempt to claim the same item simultaneously

**Expected:**
- [ ] Only one user successfully claims the item
- [ ] Other user receives an error: "Item already claimed"
- [ ] No data corruption occurs

---

### 9. Edge Cases

#### 9.1 Expired Invite Token
**Steps:**
1. Use an invite token that has expired (>30 days old)

**Expected:**
- [ ] Error message: "This invite has expired"
- [ ] User cannot accept the invite

#### 9.2 Already Used Invite Token
**Steps:**
1. Try to use an invite token that was already accepted

**Expected:**
- [ ] Error message: "This invite has already been used"

#### 9.3 Email Mismatch
**Steps:**
1. Try to accept an invite while signed in with a different email

**Expected:**
- [ ] Error message about email mismatch
- [ ] Invite is not accepted

---

## Checklist Summary

### Authentication
- [ ] Magic link sign in works
- [ ] Sign out works
- [ ] Session persists across page refreshes

### Registry Operations
- [ ] Create registry
- [ ] List registries on dashboard
- [ ] View registry details

### Invite Operations
- [ ] Send invites
- [ ] Accept invites
- [ ] Pending status visible
- [ ] Collaborator can invite (if enabled)

### Item Operations
- [ ] Add items to own sub-list
- [ ] Edit items
- [ ] Delete items (soft delete)
- [ ] URL parsing works

### Claim Operations
- [ ] Claim items on others' lists
- [ ] Release claims
- [ ] Mark as bought
- [ ] Owner cannot see claims

### Removal Operations
- [ ] Owner can remove collaborators
- [ ] Cascade delete works
- [ ] Claims cleared on removal

### Security
- [ ] Users can only edit own items
- [ ] Users cannot claim own items
- [ ] Visibility rules enforced

---

## Sign-off

| Test Area | Tester | Date | Pass/Fail |
|-----------|--------|------|-----------|
| Authentication | | | |
| Registry Management | | | |
| Invite Flow | | | |
| Item Management | | | |
| Claim Flow | | | |
| Visibility Rules | | | |
| Edge Cases | | | |
