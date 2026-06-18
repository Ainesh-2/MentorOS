# Student-Mentor Allocation Rules — MentorOS

This document specifies the exact matching, balancing, and priority rules governing how students are allocated to faculty mentors. These rules must be enforced programmatically by the allocation routers.

---

## 1. Rule: Department Alignment
- **Requirement**: A student **must** only be allocated to a mentor belonging to the same academic department.
- **Verification**: `student.department == mentor.department`
- **Exceptions**: None. Inter-departmental mentoring is disallowed to ensure domain-specific academic guidance.

---

## 2. Rule: Roster Capacity Limits
- **Requirement**: A mentor cannot exceed their maximum allowed mentee capacity.
- **Verification**:
  $$\text{Count}(\text{student} \in \text{mentor.students}) < \text{mentor.max\_mentees}$$
- **Default capacity**: 20 students per mentor.
- **Override**: Admins can adjust `mentor.max_mentees` individually (e.g. senior HODs might have a lower cap like 10, whereas full-time mentors might take up to 30).
- **Enforcement**: If a manual or automatic allocation request would push a mentor beyond their capacity cap, the API must return `HTTP 400 Bad Request`.

---

## 3. Rule: Auto-Allocation and Balancing
When triggering automatic cohort allocation, the system distributes unassigned students using a balanced-load algorithm:
1. **Scope Identification**: Filter all unassigned students in department $D$ and all active mentors in department $D$.
2. **Sort Mentors**: Order mentors in department $D$ in ascending order of their current assigned mentee count.
3. **Assign and Cycle**:
   - Assign the next unassigned student to the mentor with the lowest count.
   - Increment that mentor's count.
   - Re-sort or round-robin to ensure load remains balanced within $\pm 1$ student difference.
4. **Capacity Block**: If all mentors reach their `max_mentees` limit, the auto-allocation job halts and logs a warning requesting admin capacity updates.

---

## 4. Rule: Prioritization by Risk
To optimize student success rates, HOD reviews must prioritize allocation actions:
- Students flagged as **Coral** (Critical) or **Amber** (At-risk) who are unassigned must be matched first.
- The system should flag and highlight unassigned students in risk categories on the HOD dashboard roster workspace.
