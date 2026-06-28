import {Platform} from 'react-native'

const HOST = Platform.select({
    ios: "192.168.1.102",
    android: "192.168.1.102",
    default: "localhost"
})

export const API_BASE_URL = `http://${HOST}: 3000`;
export const WS_URL = `ws://${HOST}: 3000`;