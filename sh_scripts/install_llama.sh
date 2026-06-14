#!/bin/bash
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export PATH=/usr/local/cuda-13.3/bin${PATH:+:${PATH}}
# export PATH=/opt/intel/oneapi/2025.2/bin${PATH:+:${PATH}}
# source /opt/intel/oneapi/setvars.sh

CURRENT_DIR=$(pwd)

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

    
git clone https://github.com/ggml-org/llama.cpp 
cd llama.cpp
rm -r build
git pull

cmake -B build -DGGML_CCACHE=1 -DGGML_LTO=1 -DGGML_CUDA=1 -DGGML_CUDA_FA=1 -DGGML_CUDA_GRAPHS=1 -DGGML_CUDA_NCCL=1 -DGGML_CUDA_PEER_MAX_BATCH_SIZE=512 -DGGML_CUDA_PEER_COPY=1 -DCMAKE_CUDA_ARCHITECTURES="86-real;120-real" -DGGML_CUDA_FP16=1 -DGGML_CUDA_FA_ALL_QUANTS=on -DGGML_SCHED_MAX_COPIES=14 -DGGML_CUDA_COMPRESSION_LEVEL=3
  
cmake --build build --config Release -j 20 --clean-first  

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
