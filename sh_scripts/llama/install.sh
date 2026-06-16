#!/bin/bash
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export PATH=/usr/local/cuda-13.3/bin${PATH:+:${PATH}}
# export PATH=/opt/intel/oneapi/2025.2/bin${PATH:+:${PATH}}
# source /opt/intel/oneapi/setvars.sh

CURRENT_DIR=$(pwd)

# MODELS
# -----------------
# MODEL=router.sh
# MODEL=Qwen3.6-27B-Q8_0.sh
MODEL=Qwen3.6-35B-A3B-Q8_0.sh
# MODEL=Qwen3.6-27B-Q8_0-mtp.sh
# MODEL=gemma-4-31b-qat.sh

rm run.sh
echo -e "#!/bin/bash
CURRENT_DIR=$(pwd)
cd $CURRENT_DIR
$CURRENT_DIR/models/./$MODEL

" >> $CURRENT_DIR/run.sh
chmod 755 run.sh

mkdir $HOME/.llama_cache
mkdir $HOME/.config/systemd
mkdir $HOME/.config/systemd/user
mkdir ~/.llm_models

systemctl --user stop llama.service
systemctl --user disable llama.service
rm $HOME/.config/systemd/user/llama.service

read -p "Do you want to compile llama.cpp? (y/n): " choice
if [ "$choice" == "y" ]; then
    
  git clone https://github.com/ggml-org/llama.cpp 

  cd llama.cpp
  rm -r build
  git pull

  cmake -B build -DGGML_CCACHE=1 -DGGML_LTO=1 -DGGML_CUDA=1 -DGGML_CUDA_FA=1 -DGGML_CUDA_GRAPHS=1 -DGGML_CUDA_NCCL=1 -DGGML_CUDA_PEER_MAX_BATCH_SIZE=256 -DGGML_CUDA_PEER_COPY=1 -DCMAKE_CUDA_ARCHITECTURES="86-real;120-real" -DGGML_CUDA_FP16=1 -DGGML_CUDA_FA_ALL_QUANTS=on -DGGML_CUDA_COMPRESSION_LEVEL=3
  
  #  -DGGML_CUDA_FA_ALL_QUANTS=on -DGGML_CUDA_FORCE_MMQ=on -DCMAKE_CUDA_ARCHITECTURES="86;120" -DGGML_CUDA_PEER_MAX_BATCH_SIZE=1024 -DGGML_CCACHE=on -DGGML_LTO=on -DGGML_CUDA_FORCE_CUBLAS=on -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=Intel10_64lp -DCMAKE_C_COMPILER=icx -DCMAKE_CXX_COMPILER=icpx  -DGGML_CUDA_FORCE_MMQ=on -DGGML_CUDA_FA_ALL_QUANTS=on  -DGGML_CUDA_COMPRESSION_LEVEL=4

  cmake --build build --config Release -j 20 --clean-first  

fi

echo -e "
[Unit]
Description=Lamma Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/run.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
" >> $HOME/.config/systemd/user/llama.service

loginctl enable-linger $USER
systemctl --user daemon-reload
systemctl --user enable llama.service
systemctl --user start llama.service
