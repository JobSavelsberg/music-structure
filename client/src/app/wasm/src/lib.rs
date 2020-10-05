use wasm_bindgen::prelude::*;

mod console;
mod similarity;

struct SSMMatrix{
    data: Vec<f32>,
    size: u32,
}

struct SSMMatrixInt{
    data: Vec<u16>,
    size: u32,
}

#[wasm_bindgen]
pub fn calculate_ssm(feature_length: usize, features: Vec<f32>) -> Vec<f32>{
    let mut ssm: SSMMatrix = SSMMatrix{
        data: vec![], 
        size: features.len() as u32
    };

    log!("FeatureLength is {}", feature_length);

    let samples: usize = features.len() / feature_length;
    log!("Number of samples is {}", samples);

    for i in 0..samples{
        let i_f = i*feature_length;
        let i_features = &features[i_f..(i_f+feature_length)];
        for j in 0..(i+1){
            let j_f = j*feature_length;
            ssm.data.push(similarity::cosine(i_features, &features[(j_f)..(j_f+feature_length)]));
        }
    }
    log!("Done calculating ");
    return ssm.data;
}

#[wasm_bindgen]
pub fn enhanceSSM(){
    log!("Rust enhance SSM");
}


#[wasm_bindgen]
pub fn cluster() {
    log!("Rust cluster");
}

#[wasm_bindgen]
pub fn tsne()  {
    log!("Rust tsne");
}
