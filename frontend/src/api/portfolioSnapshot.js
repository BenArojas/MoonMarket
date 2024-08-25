import api from "@/api/axios";

export function postSnapshot({value}) {
    return api.post(`/PortfolioSnapshot/snapshot`, null, {
        params: { value }
    })
}


export async function getPortfolioSnapshots() {
    const data = await api.get(`/PortfolioSnapshot/daily_snapshots`)
    return data.data
}