import axios from "axios";
const baseUrl = "http://localhost:8000"

export function postSnapshot({value, token}) {
    return axios.post(`${baseUrl}/PortfolioSnapshot/snapshot`, null, {
        params: { value },
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })
}


export async function getPortfolioSnapshots(token) {
    const data = await axios.get(`${baseUrl}/PortfolioSnapshot/daily_snapshots`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })
    return data.data
}