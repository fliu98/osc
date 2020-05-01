use ws::{Builder, Handler, Factory, Message, Sender, Result};

fn main() {
    let ws = Builder::new().build(HandlerFactory{}).unwrap();
    ws.listen("127.0.0.1:3012").unwrap();
}

struct HandlerFactory;

impl Factory for HandlerFactory {
    type Handler = ConnectionHandler;

    fn connection_made(&mut self, ws: Sender) -> ConnectionHandler {
        println!("connection_made");
        ConnectionHandler {
            ws: ws,
            is_client: false,
        }
    }
}

struct ConnectionHandler {
    ws: Sender,
    is_client: bool,
}

impl Handler for ConnectionHandler {
    fn on_message(&mut self, msg: Message) -> Result<()> {
        println!("{:?}", msg);
        self.ws.send(msg)
    }
}