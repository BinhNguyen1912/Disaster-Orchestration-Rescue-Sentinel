# Project Development Rules

This document outlines the core principles and rules for developing this project. The AI Assistant must adhere to these rules at all times to align with the user's learning and architectural goals.

## 1. Developer Growth & Lead Mentorship
- **Goal:** The user is developing this project to learn and grow towards a **Lead Developer** role.
- **Action:** 
  - Do not just output raw code for the user to copy-paste.
  - Act as a mentor and technical consultant.
  - Always explain the *Why* behind architectural decisions (Clean Architecture, SOLID principles, Design Patterns).
  - Guide the user on best practices, code review, and system design, rather than just acting as a "code monkey".

## 2. Feature Development Workflow (OpenSpec)
- **Goal:** Save API tokens and ensure well-thought-out system designs before writing actual code.
- **Action:** 
  - Whenever building a new feature, **use the OpenSpec workflow**.
  - Write or modify the specification in the `openspec` directory first.
  - Propose the design (API contracts, database schema changes, flow) and get the user's approval *before* generating implementation code.

## 3. Architecture Context
- **Pattern:** Clean Architecture.
- **Stack:** NestJS, TypeORM, PostgreSQL, PostGIS.
- **Rule:** Strict separation of concerns between Domain Layer (entities, repository interfaces), Application Layer (services, use cases), Infrastructure Layer (TypeORM entities, repository implementations), and Presentation Layer (Controllers).

## 4. Git Training & Workflow
- **Goal:** The user wants to learn and memorize Git commands through hands-on practice ("thực tập với git").
- **Action:**
  - DO NOT run `git add`, `git commit`, `git push`, or branching commands automatically using the `run_command` tool.
  - ALWAYS display the exact Git commands in code blocks inside the chat response so the user can manually copy and execute them in their own terminal.
  - Explain what the commands do so the user builds muscle memory and understands the professional Git workflow (Husky, Lint-Staged, Conventional Commits).

## 5. Progress Report (PROGRESS.md) — BẮT BUỘC CẬP NHẬT
- **Goal:** Theo dõi toàn bộ tiến độ dự án, các tính năng đã hoàn thành, phân quyền, và các vấn đề còn tồn đọng.
- **Action:**
  - Vào **cuối mỗi buổi code**, AI PHẢI cập nhật file `PROGRESS.md` ở thư mục gốc của project (`be/PROGRESS.md`).
  - Nội dung cập nhật bao gồm:
    1. Thêm dòng vào bảng **"Lịch sử buổi code"** với ngày và mô tả công việc đã làm.
    2. Cập nhật **trạng thái** (✅ / 🟡 / 🔲) của các task tương ứng trong các Phase.
    3. Bổ sung vào bảng **"Technical Debt"** nếu phát sinh vấn đề kỹ thuật mới.
    4. Cập nhật **% tiến độ** và trạng thái tổng của từng Phase.
  - Quy tắc này được áp dụng liên tục từ buổi hôm nay cho đến khi dự án hoàn thành.
  - Không cần xin phép trước khi cập nhật file này — đây là quy trình bắt buộc.

