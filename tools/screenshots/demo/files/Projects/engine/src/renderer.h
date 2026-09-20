// Engine - public renderer interface (demo content).
#pragma once

#include <cstdint>
#include <vector>

namespace engine
{

struct Vec3
{
    float x, y, z;
};

struct Triangle
{
    Vec3 a, b, c;
    std::uint32_t colour;
};

class Renderer
{
public:
    Renderer(int width, int height);

    void Clear(std::uint32_t colour);
    void Draw(const std::vector<Triangle>& mesh);
    const std::vector<std::uint32_t>& Pixels() const { return Frame; }

private:
    void Rasterise(const Triangle& t);

    int Width;
    int Height;
    std::vector<std::uint32_t> Frame;
    std::vector<float> Depth;
};

} // namespace engine
