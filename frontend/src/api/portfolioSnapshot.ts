import api from "@/api/axios";

type SnapshotData = {
  value: number
  cumulativeSpent: number
}
export function postSnapshot({ value, cumulativeSpent }: SnapshotData) {
    return api.post(`/portfolio-snapshot/snapshot`, null, {
      params: { value, cumulativeSpent },
    });
  }


export async function getPortfolioSnapshots() {
    const data = await api.get(`/portfolio-snapshot/daily_snapshots`)
    return data.data
}