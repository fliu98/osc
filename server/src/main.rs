use ws::{Builder, Handler, Factory, Message, Sender, Result, CloseCode};
use num_enum::TryFromPrimitive;
use std::convert::TryFrom;
use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;
use json;

fn main() {
    let senders = Rc::new(RefCell::new(HashMap::new()));
    let ws = Builder::new()
        .build(
            HandlerFactory{
                connections: 0,
                senders: Rc::clone(&senders)
            }
        ).unwrap();
    ws.listen("127.0.0.1:3012").unwrap();
}

struct HandlerFactory {
    connections: u8,
    senders: Rc<RefCell<HashMap<u8, Sender>>>
}

impl Factory for HandlerFactory {
    type Handler = ConnectionHandler;

    // TODO: probably make SDP atomic ...
    fn connection_made(&mut self, ws: Sender) -> ConnectionHandler {
        let id = self.connections;
        println!("connection_made, offering id {:?}", id);
        match ws.send(
            json::stringify(json::object!{
                type: PayloadType::IDOffer as u8,
                id: id
            })
        ) {
            Err(e) => println!("offer failed with error {:?}", e),
            _ => assert!(true)
        };
        self.connections += 1;
        self.senders.borrow_mut().insert(id, ws);
        ConnectionHandler {
            id: id,
            id_acked: false,
            senders: Rc::clone(&self.senders)
        }
    }
}

struct ConnectionHandler {
    id: u8,
    id_acked: bool,
    senders: Rc<RefCell<HashMap<u8, Sender>>>
}

impl Handler for ConnectionHandler {
    fn on_message(&mut self, msg: Message) -> Result<()> {
        match msg {
            Message::Text(v) => {
                match json::parse(&v) {
                    Ok(json_obj) => {
                        println!("{:?}", json_obj.clone());
                        match json_obj["type"].as_u8() {
                            Some(payload_code) => {
                                match PayloadType::try_from(payload_code) {
                                    Ok(payload_type) => {
                                        if !self.id_acked && payload_type != PayloadType::IDAck {
                                            println!("Client failed to accept ID offer. Closing...");
                                            self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Protocol)
                                        } else {
                                            match payload_type {
                                                PayloadType::IDAck => {
                                                    self.id_acked = true;
                                                    Ok(())
                                                },
                                                PayloadType::NewParticipant => {
                                                    self.senders.borrow().get(&self.id).unwrap().broadcast(v)
                                                },
                                                PayloadType::CandidateInfo 
                                                | PayloadType::SDPOffer
                                                | PayloadType::SDPAnswer => {
                                                    Ok(())
                                                },
                                                _ => {
                                                    println!("Unknown payload type. Closing...");
                                                    self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Invalid)
                                                }
                                            }
                                        }
                                    }
                                    _ => {
                                        println!("Failed to parse payload type. Closing...");
                                        self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Invalid)
                                    }
                                }
                            },
                            _ => {
                                println!("Expected u8 for payload code. Closing...");
                                self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Invalid)
                            }
                        }
                    },
                    _ => {
                        println!("Cannot parse message as JSON. Closing...");
                        self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Invalid)
                    }
                }
            },
            _ => {
                println!("Expected Text Message. Closing...");
                self.senders.borrow().get(&self.id).unwrap().close(CloseCode::Invalid)
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
    CandidateInfo,
    SDPOffer,
    SDPAnswer
}