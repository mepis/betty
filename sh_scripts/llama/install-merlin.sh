#!/bin/bash
export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export PATH=/usr/local/cuda-13.3/bin${PATH:+:${PATH}}

CURRENT_DIR=$(pwd)

# MODELS
# -----------------
MODEL=router.sh

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

  cmake -B build -DGGML_CCACHE=1 -DCMAKE_CUDA_ARCHITECTURES="89-real" -DGGML_LTO=1 -DGGML_CUDA=1 -DGGML_CUDA_FA=1 -DGGML_CUDA_GRAPHS=1 -DGGML_CUDA_NCCL=1 -DGGML_CUDA_PEER_MAX_BATCH_SIZE=1024
  
  cmake --build build --config Release -j 8 --clean-first  

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


