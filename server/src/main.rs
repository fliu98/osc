use ws::{Builder, Handler, Factory, Message, Sender, Result, CloseCode};
use num_enum::TryFromPrimitive;
use std::convert::TryFrom;

fn main() {
    let ws = Builder::new()
        .build(
            HandlerFactory{
                connections: 0
            }
        ).unwrap();
    ws.listen("127.0.0.1:3012").unwrap();
}

struct HandlerFactory {
    connections: u8
}

impl Factory for HandlerFactory {
    type Handler = ConnectionHandler;

    fn connection_made(&mut self, ws: Sender) -> ConnectionHandler {
        let id = self.connections;
        println!("connection_made, offering id {:?}", id);
        match ws.send(build_offer(id)) {
            Err(e) => println!("offer failed with error {:?}", e),
            _ => assert!(true)
        };
        self.connections += 1;
        ConnectionHandler {
            ws: ws,
            id: id,
            id_acked: false
        }
    }
}

struct ConnectionHandler {
    ws: Sender,
    id: u8,
    id_acked: bool
}

impl Handler for ConnectionHandler {
    fn on_message(&mut self, msg: Message) -> Result<()> {
        match msg {
            Message::Binary(v) => match PayloadType::try_from(v[0]) {
                Ok(p_type) => {
                    if !self.id_acked && p_type != PayloadType::IDAck {
                        println!("Client failed to accept ID offer. Closing...");
                        self.ws.close(CloseCode::Protocol)
                    } else {
                        match p_type {
                            PayloadType::IDAck => {
                                self.id_acked = true;
                                self.ws.broadcast(build_new_participant(self.id))
                            },
                            PayloadType::Video => self.ws.broadcast(Message::Binary(v)),
                            _ => {
                                println!("Received unknown payload type. Closing...");
                                self.ws.close(CloseCode::Invalid)
                            }
                        }
                    }
                },
                Err(_) => {
                    println!("Failed to parse payload type! Closing...");
                    self.ws.close(CloseCode::Invalid)
                }
            },
            _ => {
                println!("Received something other than byte data! Closing...");
                self.ws.close(CloseCode::Invalid)
            }
        }
    }
}

#[derive(Debug, PartialEq, TryFromPrimitive)]
#[repr(u8)]
enum PayloadType {
    IDOffer,
    IDAck,
    NewParticipant,
    //UpdateParticipants,
    Video
}

fn build_offer(id: u8) -> Message {
    Message::Binary(vec![PayloadType::IDOffer as u8, id])
}

//TODO
// fn build_update_participants() -> Message {
// }

//TODO: replace this with UpdateParticipants
fn build_new_participant(id: u8) -> Message {
    Message::Binary(vec![PayloadType::NewParticipant as u8, id])
}