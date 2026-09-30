use sticknodes_rs::Stickfigure;
fn main() {
    for path in std::env::args().skip(1) {
        let bytes = std::fs::read(&path).unwrap();
        match Stickfigure::from_bytes(bytes) {
            Ok(sf) => {
                let out = path.replace(".nodes", ".json");
                std::fs::write(&out, serde_json::to_string_pretty(&sf.to_serializable()).unwrap()).unwrap();
                println!("ok {}", out);
            }
            Err(e) => println!("ERR {} {:?}", path, e),
        }
    }
}
