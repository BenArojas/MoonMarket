import api from "@/api/axios";

export function postSnapshot({ value, cumulativeSpent }) {
    return api.post(`/portfolio-snapshot/snapshot`, null, {
      params: { value, cumulativeSpent },
    });
  }


export async function getPortfolioSnapshots() {
    const data = await api.get(`/portfolio-snapshot/daily_snapshots`)
    return data.data
}