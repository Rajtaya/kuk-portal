/**
 * Single source of truth for sanctioned-post occupancy ("filled / vacant / excess").
 *
 * An active employee fills a sanctioned post only on an EXACT match: same university +
 * department + present designation + post type and — when the post names one — the same
 * subject. A substring/looser match over-counts (a "Professor" post would otherwise catch
 * Associate/Assistant Professors, and SFS staff could fill Budgeted posts), which makes
 * filled + vacant exceed the sanctioned total instead of reconciling to it.
 *
 * Bucketing employees by university|department keeps this O(posts + employees) rather than
 * O(posts × employees). Both the Sanctioned Posts vacancy report and the dashboard KPI call
 * this so their numbers can never drift apart.
 */

export interface VacancyPost {
  universityId: string;
  departmentId: string | null;
  designation: string;
  postType: string;
  subject: string | null;
  sanctionedCount: number;
}

export interface VacancyEmployee {
  universityId: string;
  departmentId: string | null;
  designationPresent: string | null;
  postType: string;
  subject: string | null;
}

export interface PostFill {
  filled: number;
  vacant: number;
  excess: number;
}

export function computePostFill(posts: VacancyPost[], employees: VacancyEmployee[]): PostFill[] {
  const buckets = new Map<string, { designation: string; subject: string; postType: string }[]>();
  for (const e of employees) {
    if (!e.departmentId) continue;
    const key = `${e.universityId}|${e.departmentId}`;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push({
      designation: (e.designationPresent || '').toLowerCase().trim(),
      subject: (e.subject || '').toLowerCase().trim(),
      postType: e.postType,
    });
  }

  return posts.map((post) => {
    const candidates = buckets.get(`${post.universityId}|${post.departmentId}`) || [];
    const desig = post.designation.toLowerCase().trim();
    const subj = post.subject ? post.subject.toLowerCase().trim() : null;

    let filled = 0;
    for (const emp of candidates) {
      if (emp.designation !== desig) continue;
      if (emp.postType !== post.postType) continue;
      if (subj && emp.subject !== subj) continue;
      filled++;
    }

    return {
      filled,
      vacant: Math.max(0, post.sanctionedCount - filled),
      excess: Math.max(0, filled - post.sanctionedCount),
    };
  });
}

/** Total vacant across all posts — the dashboard "Vacant Seats" KPI. */
export function totalVacant(posts: VacancyPost[], employees: VacancyEmployee[]): number {
  return computePostFill(posts, employees).reduce((sum, p) => sum + p.vacant, 0);
}
