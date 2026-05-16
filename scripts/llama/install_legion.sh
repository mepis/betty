#!/bin/bash

# User Defined
# MODEL=router_legion.sh

MODEL=router_legion.sh
# -----------------------

export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1 
export PATH=/opt/intel/oneapi/2025.2/bin:/opt/intel/oneapi/compiler/latest/lib/${PATH:+:${PATH}}
source /opt/intel/oneapi/setvars.sh
export PATH=/usr/local/cuda-13.2/bin${PATH:+:${PATH}}
export CUDACXX=$(which nvcc)
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

read -p "Do you want to compile llama.cpp? (y/n): " choice
if [ "$choice" == "y" ]; then
    
  git clone https://github.com/ggml-org/llama.cpp 

  cd llama.cpp
  rm -r build
  git pull

  cmake -B build -DGGML_CCACHE=on -DGGML_LTO=on -DGGML_NATIVE=on -DGGML_CUDA=on -DLLAMA_CURL=ON -DGGML_CUDA_FA=on -DGGML_CUDA_GRAPHS=on -DGGML_CUDA_FORCE_MMQ=on -DGGML_CUDA_FA_ALL_QUANTS=on -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=Intel10_64lp -DCMAKE_C_COMPILER=icx -DCMAKE_CXX_COMPILER=icpx

  cmake --build build --config Release -j 6 --clean-first  

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
