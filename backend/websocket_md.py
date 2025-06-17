import websocket
import time
import ssl

def on_message(ws, message):
    print(message)

def on_error(ws, error):
    print(error)

def on_close(ws):
    print("## CLOSED! ##")

def on_open(ws):
    print("Opened Connection")
    time.sleep(3)
    conids = ['450017186', '9969543', '511470142', '395179962', '481691285', '679998205', '677037673', '526906130', '760582932', '474219659', '292830677', '532497563']

    for conid in conids:
        ws.send('smd+'+conid+'+{"fields":["31","84","86"]}')

if __name__ == "__main__":
    ws = websocket.WebSocketApp(
        url="wss://localhost:5000/v1/api/ws",
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    ws.run_forever(sslopt={"cert_reqs":ssl.CERT_NONE})