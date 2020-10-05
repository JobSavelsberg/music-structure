

pub fn cosine(a: &[f32], b: &[f32]) -> f32 {
    let mut adotv = 0.0;
    let mut amag = 0.0;
    let mut bmag = 0.0;
    for i in 0..a.len() {
        adotv += a[i] * b[i];
        amag += a[i] * a[i];
        bmag += b[i] * b[i];
    }
    amag = amag.sqrt();
    bmag = bmag.sqrt();
    return adotv / (amag * bmag);
}

pub fn squared(a: &[f32], b: &[f32]) -> f32 {
    let mut sum = 0.0;
    for i in 0..a.len() {
        let dist = (a[i] - b[i]).abs();
        sum += dist*dist;
    }
    return sum / a.len() as f32;
}
