# UI Improvement Plan

## Overview
Step-by-step plan to improve the app's UI consistency, fix critical issues, and standardize the design system.

## Todo Items

### 🚨 Priority 1 (Critical - App Breaking)
- [ ] **Fix critical tab navigation icons** - replace HTML div elements with React Native components to prevent app crashes
- [ ] **Resolve theme system conflicts** - unify Colors.ts and theme.js into single consistent system  
- [ ] **Fix Button component theme reference error** (theme.colors.text.inverse doesn't exist)

### ⚠️ Priority 2 (High - Consistency)
- [ ] **Convert Home screen** to use atomic design components instead of inline styles
- [ ] **Convert History screen** to use atomic design components instead of inline styles
- [ ] **Convert Profile screen** to use atomic design components instead of inline styles

### 📝 Priority 3 (Low - Polish)
- [ ] **Implement proper icon system** to replace emoji-based icons
- [ ] **Add review section** to todo.md with summary of UI improvements made

## Current Issues Found
1. **Tab Navigation**: HTML div elements will crash on mobile devices
2. **Dual Theme System**: Colors.ts and theme.js conflict 
3. **Component References**: Button component has invalid theme reference
4. **Styling Inconsistency**: Screens don't use established atomic components
5. **Icon System**: Emoji-based icons not scalable

## Goals
- Ensure app doesn't crash on mobile devices
- Create consistent UI using atomic design system
- Fix all theme reference errors
- Standardize styling approach across all screens

---

## Review Section
*Will be added after completing the improvements*